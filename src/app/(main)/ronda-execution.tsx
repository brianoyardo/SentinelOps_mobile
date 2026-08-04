import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
import { useGeolocation } from '@/hooks/useGeolocation';
import { HoldToTalkButton } from '@/components/ui/HoldToTalkButton';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { colors, spacing, radii, fontSizes } from '@/constants/colors';

export default function RondaExecutionScreen() {
  const { user } = useAuthStore();
  const { location, isTracking } = useGeolocation(true);
  const [roundActive, setRoundActive] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceReportUri, setVoiceReportUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (!roundActive || !startTime) return;
    const interval = setInterval(() => setElapsed(Date.now() - startTime), 1000);
    return () => clearInterval(interval);
  }, [roundActive, startTime]);

  const startRound = useCallback(() => {
    setRoundActive(true);
    setStartTime(Date.now());
  }, []);

  const handleStartRecord = useCallback(async () => {
    try {
      const { startVoiceRecording } = await import('@/services/voiceReportService');
      await startVoiceRecording();
      setIsRecording(true);
    } catch (err) {
      const m = err instanceof Error ? err.message : 'Error al grabar';
      setErrorMessage(m);
      setShowError(true);
    }
  }, []);

  const handleStopRecord = useCallback(async () => {
    if (!isRecording) return;
    try {
      const { stopVoiceRecording } = await import('@/services/voiceReportService');
      const uri = await stopVoiceRecording();
      setIsRecording(false);
      if (uri) setVoiceReportUri(uri);
    } catch {
      setIsRecording(false);
    }
  }, [isRecording]);

  const endRound = useCallback(async () => {
    setShowEndConfirm(false);
    setSubmitting(true);
    try {
      if (voiceReportUri) {
        const { sendVoiceReport } = await import('@/services/voiceReportService');
        await sendVoiceReport(voiceReportUri, {
          guardId: user?.uid,
          guardName: user?.fullName,
        });
      }
      setShowComplete(true);
      setTimeout(() => router.back(), 2000);
    } catch (err) {
      const m = err instanceof Error ? err.message : 'Error al cerrar ronda';
      setErrorMessage(m);
      setShowError(true);
    } finally {
      setSubmitting(false);
    }
  }, [voiceReportUri, user, router]);

  const formatElapsed = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Ejecución de Ronda</Text>

        {!roundActive ? (
          <TouchableOpacity style={styles.startButton} onPress={startRound} activeOpacity={0.85}>
            <Text style={styles.startIcon}>↻</Text>
            <Text style={styles.startText}>INICIAR RONDA</Text>
            <Text style={styles.startSub}>Presiona para comenzar el patrullaje</Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.timerCard}>
              <Text style={styles.timerLabel}>Tiempo transcurrido</Text>
              <Text style={styles.timerValue}>{formatElapsed(elapsed)}</Text>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Ubicación</Text>
                <Text style={styles.infoValue}>
                  {location
                    ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`
                    : 'Esperando GPS...'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tracking</Text>
                <View style={styles.trackingRow}>
                  <View style={[styles.trackingDot, isTracking && styles.trackingActive]} />
                  <Text style={styles.infoValue}>{isTracking ? 'Activo' : 'Inactivo'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reporte de Cierre</Text>
              <Text style={styles.sectionSub}>
                Graba un reporte de voz describiendo las novedades de la ronda
              </Text>
              <HoldToTalkButton
                isRecording={isRecording}
                onStartRecord={handleStartRecord}
                onStopRecord={handleStopRecord}
              />
              {voiceReportUri && (
                <View style={styles.recordedBadge}>
                  <Text style={styles.recordedIcon}>✓</Text>
                  <Text style={styles.recordedText}>Reporte grabado exitosamente</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.endButton, submitting && styles.submitDisabled]}
              onPress={() => setShowEndConfirm(true)}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.endText}>CERRAR RONDA</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <ConfirmModal
        visible={showEndConfirm}
        title="Cerrar Ronda"
        message="¿Estás seguro de que deseas finalizar esta ronda?"
        confirmText="Cerrar"
        onConfirm={endRound}
        onCancel={() => setShowEndConfirm(false)}
      />

      <ConfirmModal
        visible={showComplete}
        title="Ronda Completada"
        message="La ronda se ha cerrado exitosamente."
        confirmText="OK"
        onConfirm={() => {
          setShowComplete(false);
          router.back();
        }}
        onCancel={() => {
          setShowComplete(false);
          router.back();
        }}
      />

      <ConfirmModal
        visible={showError}
        title="Error"
        message={errorMessage}
        confirmText="OK"
        isDanger
        onConfirm={() => setShowError(false)}
        onCancel={() => setShowError(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.dark.bg },
  scroll: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.xl, paddingBottom: spacing['4xl'] },
  title: { fontSize: fontSizes['2xl'], fontWeight: '700', color: colors.dark.text },
  startButton: {
    backgroundColor: colors.accent[600],
    borderRadius: radii.xl,
    padding: spacing['3xl'],
    alignItems: 'center',
    gap: spacing.md,
  },
  startIcon: { fontSize: 40, color: '#fff' },
  startText: { fontSize: fontSizes.xl, fontWeight: '800', color: '#fff', letterSpacing: 2 },
  startSub: { fontSize: fontSizes.xs, color: 'rgba(255,255,255,0.7)' },
  timerCard: {
    backgroundColor: colors.dark.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: spacing.xl,
    alignItems: 'center',
  },
  timerLabel: { fontSize: fontSizes.sm, color: colors.dark.textMuted },
  timerValue: {
    fontSize: fontSizes['4xl'],
    fontWeight: '700',
    color: colors.primary[400],
    fontVariant: ['tabular-nums'],
    marginTop: spacing.sm,
  },
  infoCard: {
    backgroundColor: colors.dark.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: { fontSize: fontSizes.sm, color: colors.dark.textMuted },
  infoValue: { fontSize: fontSizes.sm, color: colors.dark.text, fontWeight: '600' },
  trackingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  trackingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.dark.textMuted },
  trackingActive: { backgroundColor: colors.accent[500] },
  section: { gap: spacing.md },
  sectionTitle: { fontSize: fontSizes.lg, fontWeight: '600', color: colors.dark.text },
  sectionSub: { fontSize: fontSizes.xs, color: colors.dark.textMuted, lineHeight: 16 },
  recordedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent[500] + '15',
    borderRadius: radii.md,
    padding: spacing.md,
  },
  recordedIcon: {
    fontSize: 16,
    color: colors.accent[400],
    fontWeight: '700',
  },
  recordedText: { fontSize: fontSizes.sm, color: colors.accent[400], fontWeight: '600' },
  endButton: { backgroundColor: colors.primary[600], borderRadius: radii.md, padding: spacing.lg, alignItems: 'center' },
  submitDisabled: { opacity: 0.6 },
  endText: { fontSize: fontSizes.base, fontWeight: '700', color: '#fff', letterSpacing: 2 },
});
