import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Modal } from '@/components/ui/Modal';
import { HoldToTalkButton } from '@/components/ui/HoldToTalkButton';
import { sendVoiceReport } from '@/services/voiceReportService';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { colors, spacing, radii, fontSizes } from '@/constants/colors';
import type { GeoPoint } from '@/types';

type Phase = 'idle' | 'recording' | 'recorded' | 'sending' | 'error';

interface AssignmentInfo {
  id: string;
  guardId: string;
  guardCode: string;
  guardName: string;
  rondaId: string;
  routeName: string;
  geofenceName: string;
}

interface EndRoundReportModalProps {
  visible: boolean;
  assignment: AssignmentInfo | null;
  executionId: string | null;
  currentPosition: GeoPoint | null;
  onComplete: () => void;
}

export function EndRoundReportModal({
  visible,
  assignment,
  executionId,
  currentPosition,
  onComplete,
}: EndRoundReportModalProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const recorder = useVoiceRecorder();
  const phaseRef = useRef<Phase>('idle');

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (visible) {
      setPhase('idle');
      setAudioUri(null);
      setErrorMessage('');
    }
  }, [visible]);

  const startRecording = useCallback(async () => {
    if (isStarting || phase === 'recording' || phase === 'sending') return;
    setIsStarting(true);

    try {
      setAudioUri(null);
      await recorder.startRecording();
      setPhase('recording');
    } catch (err) {
      console.error('[EndRound] Error al grabar:', err);
      setErrorMessage('No se pudo acceder al micrófono.');
      setPhase('error');
    } finally {
      setIsStarting(false);
    }
  }, [isStarting, phase]);

  const stopRecording = useCallback(async () => {
    if (phaseRef.current !== 'recording') return;

    try {
      const uri = await recorder.stopRecording();
      if (!uri) {
        setErrorMessage('Grabación muy corta. Inténtalo de nuevo.');
        setPhase('error');
        setAudioUri(null);
      } else {
        setAudioUri(uri);
        setPhase('recorded');
        setErrorMessage('');
      }
    } catch (err) {
      console.error('[EndRound] Error al detener grabación:', err);
      setErrorMessage('No se pudo acceder al micrófono.');
      setPhase('error');
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!audioUri || !assignment || !executionId) return;
    setPhase('sending');

    try {
      await sendVoiceReport(audioUri, {
        assignmentId: assignment.id,
        executionId,
        guardId: assignment.guardId,
        guardCode: assignment.guardCode,
        guardName: assignment.guardName,
        rondaId: assignment.rondaId,
        routeName: assignment.routeName,
        geofenceName: assignment.geofenceName,
        location: {
          lat: currentPosition?.lat ?? 0,
          lng: currentPosition?.lng ?? 0,
          accuracy: 5,
        },
        incidentTemplate: {
          reportedBy: 'Agente IA - n8n',
          type: 'security',
          severity: 'medium',
          tags: ['Reporte IA', 'Audio-Transcrito'],
        },
      });

      if (onComplete) onComplete();
    } catch (err) {
      console.error('[EndRound] Error al enviar reporte:', err);
      setErrorMessage('Hubo un problema al enviar el reporte. Reintenta.');
      setPhase('error');
    }
  }, [audioUri, assignment, executionId, currentPosition, onComplete]);

  return (
    <Modal visible={visible} onClose={() => {}} containerStyle={styles.modalContainer}>
      <View style={styles.header}>
        <View style={styles.shield}>
          <Text style={styles.shieldIcon}>🎙️</Text>
        </View>
        <Text style={styles.title}>Reporte Operativo</Text>
        <Text style={styles.subtitle}>Cierre de Ronda</Text>
      </View>

      <View style={styles.info}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Guardia:</Text>
          <Text style={styles.infoValue}>{assignment?.guardName || 'Guardia'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Ruta:</Text>
          <Text style={styles.infoValue}>{assignment?.routeName || 'Desconocida'}</Text>
        </View>
      </View>

      <View style={styles.actionArea}>
        {(phase === 'idle' || phase === 'recording' || phase === 'recorded' || phase === 'error') && (
          <View style={styles.micContainer}>
            <HoldToTalkButton
              isRecording={phase === 'recording'}
              disabled={false}
              onStartRecord={() => startRecording()}
              onStopRecord={() => stopRecording()}
            />
            <View style={styles.statusLine}>
              {phase === 'recording' && <Text style={styles.statusRecording}>Grabando...</Text>}
              {phase === 'recorded' && <Text style={styles.statusSuccess}>¡Audio capturado! Listo para enviar.</Text>}
              {phase === 'error' && <Text style={styles.statusError}>{errorMessage}</Text>}
              {phase === 'idle' && (
                <Text style={styles.statusIdle}>Mantén presionado para grabar reporte</Text>
              )}
            </View>
          </View>
        )}

        {phase === 'sending' && (
          <View style={styles.sendingBox}>
            <Text style={styles.sendingIcon}>⏳</Text>
            <Text style={styles.sendingText}>Enviando a Cerebro IA...</Text>
            <ActivityIndicator color={colors.primary[400]} />
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, (!audioUri || phase === 'sending') && styles.submitDisabled]}
        disabled={!audioUri || phase === 'sending'}
        onPress={handleSubmit}
        activeOpacity={0.8}
      >
        <Text style={styles.submitText}>
          {phase === 'sending' ? 'Procesando...' : 'Enviar y Cerrar Ronda'}
        </Text>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    maxHeight: '92%',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  shield: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary[600] + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  shieldIcon: {
    fontSize: 26,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.dark.text,
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.dark.textMuted,
    marginTop: spacing.xs,
  },
  info: {
    backgroundColor: colors.dark.surface,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: fontSizes.sm,
    color: colors.dark.textMuted,
  },
  infoValue: {
    fontSize: fontSizes.sm,
    color: colors.dark.text,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  actionArea: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 130,
  },
  micContainer: {
    width: '100%',
  },
  statusLine: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  statusRecording: {
    color: colors.danger[400],
    fontSize: fontSizes.sm,
  },
  statusSuccess: {
    color: colors.accent[400],
    fontSize: fontSizes.sm,
  },
  statusError: {
    color: colors.danger[400],
    fontSize: fontSizes.sm,
  },
  statusIdle: {
    color: colors.dark.textMuted,
    fontSize: fontSizes.sm,
  },
  sendingBox: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.dark.surface,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: radii.lg,
    width: '100%',
  },
  sendingIcon: {
    fontSize: 28,
  },
  sendingText: {
    fontSize: fontSizes.base,
    color: colors.dark.text,
    fontWeight: '600',
  },
  submitBtn: {
    marginTop: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.primary[600],
    alignItems: 'center',
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitText: {
    fontSize: fontSizes.base,
    fontWeight: '700',
    color: '#ffffff',
  },
});
