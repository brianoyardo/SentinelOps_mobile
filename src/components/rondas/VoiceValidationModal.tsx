import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Modal } from '@/components/ui/Modal';
import { HoldToTalkButton } from '@/components/ui/HoldToTalkButton';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { verifyVoiceIdentity } from '@/services/voiceValidationService';
import { recordVoiceValidation } from '@/services/rondaExecutionService';
import { getN8nWebhookUrl } from '@/config/n8n';
import { useGeolocation } from '@/hooks/useGeolocation';
import { colors, spacing, radii, fontSizes } from '@/constants/colors';

type Phase = 'idle' | 'recording' | 'analyzing' | 'success' | 'error';

interface AssignmentInfo {
  guardName?: string;
  guardCode?: string;
  geofenceName?: string;
}

interface VoiceValidationModalProps {
  visible: boolean;
  executionId: string | null;
  passphrase: string;
  guardName?: string;
  assignment?: AssignmentInfo;
  onSuccess: () => void;
  onFail?: (err: Error) => void;
}

async function dispararAlertaN8N(assignment: AssignmentInfo, latitud: number | null, longitud: number | null) {
  const payload = {
    tipoEvento: 'Suplantación de Identidad Biométrica',
    nombreGuardia: assignment.guardName || 'Sin Nombre',
    codigoGuardia: assignment.guardCode || 'SIN-CODIGO',
    nombreGeocerca: assignment.geofenceName || 'Geocerca Desconocida',
    horaExacta: new Date().toLocaleString('es-BO'),
    coordenadas: { lat: latitud, lng: longitud },
  };

  try {
    await fetch(getN8nWebhookUrl('alerta'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn('[VoiceValidation] Alerta n8n omitida:', err);
  }
}

export function VoiceValidationModal({
  visible,
  executionId,
  passphrase,
  guardName,
  assignment = {},
  onSuccess,
  onFail,
}: VoiceValidationModalProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const recorder = useVoiceRecorder();
  const geo = useGeolocation(false);

  const startRecording = useCallback(async () => {
    if (isStarting || phase !== 'idle') return;
    setIsStarting(true);

    try {
      await recorder.startRecording();
      setPhase('recording');
    } catch (err) {
      console.error('[VoiceValidation] Error accediendo al micrófono:', err);
      setPhase('error');
    } finally {
      setIsStarting(false);
    }
  }, [isStarting, phase]);

  const stopRecording = useCallback(async () => {
    if (phase !== 'recording') return;

    try {
      const uri = await recorder.stopRecording();
      await processVoiceValidation(uri);
    } catch (err) {
      console.error('[VoiceValidation] Error en validación:', err);
      setPhase('error');
      if (onFail) onFail(err instanceof Error ? err : new Error(String(err)));
    }
  }, [phase, onFail]);

  const processVoiceValidation = async (audioUri: string | null) => {
    setPhase('analyzing');
    try {
      const data = await verifyVoiceIdentity(audioUri);

      if (data && data.match) {
        const score = data.score || 0.96;
        setMatchScore(score);
        setPhase('success');

        if (executionId) {
          try {
            await recordVoiceValidation(executionId, {
              matchScore: score,
              passed: true,
              position: geo.position,
            });
          } catch (err) {
            console.warn('[VoiceValidation] No se pudo registrar la validación:', err);
          }
        }

        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 1500);
      } else {
        dispararAlertaN8N(assignment, geo.position?.lat ?? null, geo.position?.lng ?? null).catch(console.error);
        throw new Error('Identidad no validada por IA');
      }
    } catch (err) {
      console.error('[VoiceValidation] Error en validación:', err);
      setPhase('error');
      if (onFail) onFail(err instanceof Error ? err : new Error(String(err)));
    }
  };

  return (
    <Modal visible={visible} onClose={() => {}} containerStyle={styles.modalContainer}>
      <View style={styles.header}>
        <View style={styles.shield}>
          <Text style={styles.shieldIcon}>🛡</Text>
        </View>
        <Text style={styles.title}>Control de Identidad</Text>
        <Text style={styles.subtitle}>Verificación Biométrica Anti-Suplantación</Text>
      </View>

      <View style={styles.guardBox}>
        <Text style={styles.guardIcon}>👤</Text>
        <Text style={styles.guardName}>{guardName || 'Guardia Operativo'}</Text>
      </View>

      <View style={styles.passphraseSection}>
        <Text style={styles.passphraseLabel}>
          Por favor, mantenga presionado el botón y diga la frase de seguridad:
        </Text>
        <View style={styles.passphraseBox}>
          <Text style={styles.passphrase}>"{passphrase}"</Text>
        </View>
      </View>

      <View style={styles.actionArea}>
        {(phase === 'idle' || phase === 'recording') && (
          <HoldToTalkButton
            isRecording={phase === 'recording'}
            disabled={false}
            onStartRecord={() => startRecording()}
            onStopRecord={() => stopRecording()}
          />
        )}

        {phase === 'analyzing' && (
          <View style={[styles.analyzingBox, styles.boxBase]}>
            <Text style={styles.boxIcon}>🔍</Text>
            <Text style={styles.analyzingText}>Analizando con IA...</Text>
          </View>
        )}

        {phase === 'success' && (
          <View style={[styles.resultBox, styles.successBox]}>
            <Text style={styles.resultIcon}>✓</Text>
            <Text style={styles.successText}>Identidad verificada</Text>
            {matchScore !== null && (
              <Text style={styles.scoreText}>Confianza: {(matchScore * 100).toFixed(0)}%</Text>
            )}
          </View>
        )}

        {phase === 'error' && (
          <View style={[styles.resultBox, styles.errorBox]}>
            <Text style={styles.resultIcon}>✕</Text>
            <Text style={styles.errorText}>Error de validación</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => setPhase('idle')} activeOpacity={0.8}>
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Catar Seguridad Integral — SentinelOps v1.0</Text>
      </View>
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
    textAlign: 'center',
  },
  guardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dark.surface,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: radii.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  guardIcon: {
    fontSize: 16,
  },
  guardName: {
    fontSize: fontSizes.base,
    fontWeight: '600',
    color: colors.dark.text,
  },
  passphraseSection: {
    marginBottom: spacing.lg,
  },
  passphraseLabel: {
    fontSize: fontSizes.sm,
    color: colors.dark.textMuted,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  passphraseBox: {
    backgroundColor: colors.dark.surface,
    borderWidth: 1,
    borderColor: colors.primary[500] + '60',
    borderRadius: radii.md,
    padding: spacing.lg,
  },
  passphrase: {
    fontSize: fontSizes.base,
    color: colors.primary[300],
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 24,
  },
  actionArea: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
  },
  boxBase: {
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radii.lg,
    width: '100%',
  },
  analyzingBox: {
    backgroundColor: colors.surface[800],
    borderWidth: 1,
    borderColor: colors.dark.border,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
  },
  boxIcon: {
    fontSize: 22,
  },
  analyzingText: {
    fontSize: fontSizes.base,
    color: colors.dark.text,
    fontWeight: '600',
  },
  resultBox: {
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radii.lg,
    width: '100%',
    gap: spacing.sm,
  },
  successBox: {
    backgroundColor: colors.accent[900] + '40',
    borderWidth: 1,
    borderColor: colors.accent[500] + '60',
  },
  errorBox: {
    backgroundColor: colors.danger[900] + '30',
    borderWidth: 1,
    borderColor: colors.danger[500] + '60',
  },
  resultIcon: {
    fontSize: 32,
    color: colors.accent[400],
  },
  successText: {
    fontSize: fontSizes.base,
    color: colors.accent[300],
    fontWeight: '600',
  },
  scoreText: {
    fontSize: fontSizes.sm,
    color: colors.accent[200],
  },
  errorText: {
    fontSize: fontSizes.sm,
    color: colors.danger[300],
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.md,
    backgroundColor: colors.dark.surface,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  retryText: {
    fontSize: fontSizes.sm,
    color: colors.dark.text,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  footerText: {
    fontSize: fontSizes.xs,
    color: colors.dark.textMuted,
  },
});
