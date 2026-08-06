import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Modal } from '@/components/ui/Modal';
import { HoldToTalkButton } from '@/components/ui/HoldToTalkButton';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { enrollVoiceIdentity } from '@/services/voiceValidationService';
import { useAuth } from '@/hooks/useAuth';
import { colors, spacing, radii, fontSizes } from '@/constants/colors';

type Phase = 'idle' | 'recording' | 'analyzing' | 'success' | 'error';

interface VoiceEnrollmentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function VoiceEnrollmentModal({ visible, onClose, onSuccess }: VoiceEnrollmentModalProps) {
  const { user } = useAuth();
  const recorder = useVoiceRecorder();
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const startRecording = useCallback(async () => {
    if (isStarting || phase !== 'idle') return;
    setIsStarting(true);
    setError(null);

    try {
      await recorder.startRecording();
      setPhase('recording');
    } catch (err) {
      setError('Se requiere acceso al micrófono para grabar.');
      setPhase('error');
    } finally {
      setIsStarting(false);
    }
  }, [isStarting, phase]);

  const stopRecording = useCallback(async () => {
    if (phase !== 'recording') return;

    try {
      const uri = await recorder.stopRecording();
      await processEnrollment(uri);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar la huella de voz.');
      setPhase('error');
    }
  }, [phase]);

  const processEnrollment = async (audioUri: string | null) => {
    setPhase('analyzing');
    try {
      const targetId = user?.uid || '';
      await enrollVoiceIdentity(audioUri, targetId);
      setPhase('success');
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar la huella de voz.');
      setPhase('error');
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={() => phase === 'idle' && onClose()}
      containerStyle={styles.modalContainer}
    >
      <View style={styles.header}>
        <View style={styles.shield}>
          <Text style={styles.shieldIcon}>🎙️</Text>
        </View>
        <Text style={styles.title}>Registro de Voz</Text>
        <Text style={styles.subtitle}>Enrola tu perfil biométrico por primera vez</Text>
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionsText}>
          Para garantizar la seguridad de tu cuenta, mantén presionado el botón de micrófono y lee
          en voz alta y clara el siguiente texto:
        </Text>
        <View style={styles.passphraseBox}>
          <Text style={styles.passphrase}>
            "Yo confirmo mi identidad biométrica para el sistema SentinelOps."
          </Text>
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
            <Text style={[styles.boxIcon, styles.spin]}>⚙️</Text>
            <Text style={styles.analyzingText}>Procesando firma...</Text>
          </View>
        )}

        {phase === 'success' && (
          <View style={[styles.resultBox, styles.successBox]}>
            <Text style={styles.resultIcon}>✓</Text>
            <Text style={styles.successText}>Perfil guardado exitosamente</Text>
          </View>
        )}

        {phase === 'error' && (
          <View style={[styles.resultBox, styles.errorBox]}>
            <Text style={styles.resultIcon}>✕</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => setPhase('idle')} activeOpacity={0.8}>
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {phase === 'idle' && (
        <View style={styles.footer}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    maxHeight: '90%',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
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
  instructions: {
    marginBottom: spacing.xl,
  },
  instructionsText: {
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
  spin: {
    opacity: 0.9,
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
  closeText: {
    fontSize: fontSizes.base,
    color: colors.dark.textMuted,
    fontWeight: '600',
  },
});
