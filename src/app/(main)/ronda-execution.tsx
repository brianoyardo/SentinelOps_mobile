import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
import { useRondaExecution } from '@/hooks/useRondaExecution';
import { startExecution, getExecution, findActiveExecutionByAssignment, abortVoiceSession } from '@/services/rondaExecutionService';
import { getAssignment } from '@/services/rondaAssignmentService';
import { getRoute, getCheckpointsByRoute } from '@/services/spatialService';
import { STATE_LABELS, STATE_COLORS, RONDA_STATES } from '@/utils/rondaStateMachine';
import { VOICE_PASSPHRASES } from '@/config/constants';
import { PreOpModal } from '@/components/rondas/PreOpModal';
import { VoiceValidationModal } from '@/components/rondas/VoiceValidationModal';
import { NotesModal } from '@/components/rondas/NotesModal';
import { EndRoundReportModal } from '@/components/rondas/EndRoundReportModal';
import { colors, spacing, radii, fontSizes } from '@/constants/colors';
import type { RondaAssignment } from '@/types';
type Phase = 'preop' | 'voice' | 'execution';

interface FlatCheckpoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  order: number;
  radius?: number;
}

interface Feedback {
  type: 'success' | 'error';
  message: string;
}

function checkpointToFlat(cp: unknown): FlatCheckpoint | null {
  const anyCp = cp as { id?: string; name?: string; geometry?: { coordinates?: [number, number] }; order?: number } | null;
  if (!anyCp?.geometry || !anyCp.geometry.coordinates) return null;
  const [lng, lat] = anyCp.geometry.coordinates;
  return {
    id: anyCp.id ?? '',
    name: anyCp.name ?? 'Checkpoint',
    lat,
    lng,
    order: anyCp.order || 0,
  };
}

export default function RondaExecutionScreen() {
  const { assignmentId: paramId } = useLocalSearchParams<{ assignmentId: string; startedLate?: string }>();
  const startedLate = useLocalSearchParams<{ startedLate?: string }>().startedLate === 'true';
  const router = useRouter();
  const { user } = useAuthStore();

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState<RondaAssignment | null>(null);
  const [route, setRoute] = useState<{ name?: string } | null>(null);
  const [checkpoints, setCheckpoints] = useState<FlatCheckpoint[]>([]);
  const [initialCompletedIds, setInitialCompletedIds] = useState<string[]>([]);
  const [initialTrail, setInitialTrail] = useState<Array<{ lat: number; lng: number }>>([]);

  // ─── Phase Management ───
  const [phase, setPhase] = useState<Phase>('preop');
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [preOpKey, setPreOpKey] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [showEndReportModal, setShowEndReportModal] = useState(false);

  // ─── Real Data Loading ───
  useEffect(() => {
    if (!paramId) return;

    async function loadData() {
      try {
        const assign = await getAssignment(paramId);
        if (!assign) {
          setFeedback({ type: 'error', message: 'Esta asignación ya no existe en la base de datos.' });
          setLoading(false);
          return;
        }
        setAssignment(assign);

        if (assign.routeId) {
          const [r, cps] = await Promise.all([
            getRoute(assign.routeId),
            getCheckpointsByRoute(assign.routeId),
          ]);
          if (r) setRoute(r);
          setCheckpoints(cps.map(checkpointToFlat).filter((cp): cp is FlatCheckpoint => cp !== null));
        }

        // ─── BLINDAJE DE RESTAURACIÓN DE SESIÓN ───
        let foundExecutionId: string | null = assign.executionId;
        let execData: import('@/types').RondaExecution | null = null;
        const activeStatuses: string[] = [RONDA_STATES.IN_PROGRESS, RONDA_STATES.PAUSED, RONDA_STATES.VALIDATING_VOICE];

        // 1. Siempre buscar la verdad absoluta en Firestore
        const activeDoc = await findActiveExecutionByAssignment(paramId);
        if (activeDoc) {
          foundExecutionId = activeDoc.id;
          execData = activeDoc;
        } else if (foundExecutionId) {
          const exec = await getExecution(foundExecutionId);
          if (exec) execData = exec;
        }

        // 2. Si tenemos ejecución activa, saltar al mapa INMEDIATAMENTE
        if (execData && activeStatuses.includes(execData.status as string)) {
          const TEN_MIN_MS = 10 * 60 * 1000;
          const createdAt = toMillis(execData.createdAt) ?? 0;
          const isVoiceExpired =
            execData.status === RONDA_STATES.VALIDATING_VOICE &&
            Date.now() - createdAt > TEN_MIN_MS;

          if (isVoiceExpired) {
            console.warn('[RondaExecution] Validación de voz vencida (>10 min). Reiniciando flujo pre-op.');
            setPhase('preop');
            setLoading(false);
            return;
          }

          setExecutionId(foundExecutionId);
          setInitialCompletedIds((execData.completedCheckpoints as string[]) || []);
          setInitialTrail(((execData.gpsTrack as Array<{ lat: number; lng: number }>) || []).map((p) => ({ lat: p.lat, lng: p.lng })));
          setPhase(execData.status === RONDA_STATES.VALIDATING_VOICE ? 'voice' : 'execution');
          setLoading(false);
          return;
        }
        // ─── FIN DEL BLINDAJE ───
      } catch (err) {
        console.error('Error loading execution data:', err);
        setFeedback({ type: 'error', message: 'Error cargando datos de la ronda' });
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [paramId]);

  // ─── Back-button guard durante fase VOICE ───
  // Si el guardia sale durante la validación de voz, revertimos el estado
  // en Firestore para que la asignación no quede en 'validating_voice' para siempre.
  const navigation = useNavigation();
  useEffect(() => {
    if (phase !== 'voice') return;

    const unsubscribe = navigation.addListener('beforeRemove', () => {
      abortVoiceSession(executionId ?? '', assignment?.id ?? null);
    });

    return unsubscribe;
  }, [phase, executionId, assignment?.id, navigation]);

  // ─── Execution Hook ───
  const exec = useRondaExecution({
    assignmentId: paramId,
    rondaId: assignment?.rondaId || '',
    routeId: assignment?.routeId || '',
    guardId: user?.uid || '',
    guardName: assignment?.guardName || user?.fullName || 'Desconocido',
    guardCode: assignment?.guardCode || 'SIN-CODIGO',
    geofenceName: assignment?.geofenceName || 'Geocerca no identificada',
    checkpoints,
    scheduledEnd: assignment?.scheduledEnd || Date.now() + 2 * 60 * 60 * 1000,
    executionId: phase === 'execution' ? executionId : null,
    initialCompletedIds,
    initialTrail,
  });

  // ─── Pre-Op Modal Confirm ───
  const handlePreOpConfirm = async (data: { patrolType: string; vehicleId: string | null; shift: string }) => {
    try {
      const pos = await requireGps();

      const execId = await startExecution({
        assignmentId: paramId,
        rondaId: assignment?.rondaId || '',
        routeId: assignment?.routeId || '',
        guardId: user?.uid || '',
        guardName: assignment?.guardName || user?.fullName || 'Desconocido',
        guardCode: assignment?.guardCode || 'SIN-CODIGO',
        geofenceName: assignment?.geofenceName || 'Geocerca no identificada',
        checkpointIds: checkpoints.map((cp) => cp.id),
        startPosition: pos,
        initialState: RONDA_STATES.VALIDATING_VOICE as 'validating_voice',
        patrolType: data.patrolType,
        vehicleId: data.vehicleId,
        shift: data.shift,
        voicePassphrase: VOICE_PASSPHRASES[0],
        startedLate,
      });

      setExecutionId(execId);
      setPhase('voice');
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Error' });
      setPreOpKey((k) => k + 1);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handlePreOpCancel = () => {
    router.back();
  };

  // ─── Voice Validation Success ───
  const handleVoiceSuccess = () => {
    setPhase('execution');
    if (executionId) exec.startWithExecutionId(executionId);
  };

  const handleVoiceFail = () => {
    setFeedback({ type: 'error', message: 'Validación biométrica fallida' });
    setTimeout(() => setFeedback(null), 3000);
  };

  // ─── Intercepción de Fin de Ronda ───
  useEffect(() => {
    if (
      phase === 'execution' &&
      exec.isActive &&
      checkpoints.length > 0 &&
      exec.validation.completedCount === checkpoints.length &&
      !showEndReportModal
    ) {
      setShowEndReportModal(true);
    }
  }, [exec.isActive, exec.validation.completedCount, checkpoints.length, phase, showEndReportModal]);

  const handleEndRoundComplete = () => {
    setShowEndReportModal(false);
    exec.finishRonda();
  };

  // ─── Redirect a Mis Rondas al completar ───
  useEffect(() => {
    if (exec.status === RONDA_STATES.COMPLETED) {
      const timer = setTimeout(() => {
        router.replace('/(main)/mis-rondas');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [exec.status, router]);

  // ─── Checkpoint Handler ───
  const handleCheckpoint = async () => {
    if (!exec.nextCheckpoint) return;

    const result = await exec.registerCheckpointHit(exec.nextCheckpoint.id);

    if (result.success) {
      setFeedback({ type: 'success', message: `✓ ${exec.nextCheckpoint.name} registrado` });
    } else {
      const reason =
        'validation' in result && result.validation?.reason
          ? result.validation.reason
          : (exec.error ?? 'Error');
      setFeedback({ type: 'error', message: reason });
    }

    setTimeout(() => setFeedback(null), 3000);
  };

  const stateColor = STATE_COLORS[exec.status as keyof typeof STATE_COLORS] || '#64748b';
  const gpsStatus =
    exec.accuracy == null
      ? 'none'
      : exec.accuracy <= 15
        ? 'ok'
        : exec.accuracy <= 40
          ? 'warn'
          : 'bad';

  // ─── Render: Loading ───
  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerBox}>
          <ActivityIndicator color={colors.primary[400]} size="large" />
          <Text style={styles.centerText}>Cargando datos de la ronda...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Render: Pre-Op Modal ───
  if (phase === 'preop') {
    return (
      <SafeAreaView style={styles.safe}>
        <PreOpModal
          key={preOpKey}
          visible
          rondaName={route?.name || assignment?.routeName || 'Ronda Operativa'}
          notes={assignment?.notes}
          onConfirm={handlePreOpConfirm}
          onCancel={handlePreOpCancel}
        />
      </SafeAreaView>
    );
  }

  // ─── Render: Voice Validation Modal ───
  if (phase === 'voice' && executionId) {
    return (
      <SafeAreaView style={styles.safe}>
        <VoiceValidationModal
          visible
          executionId={executionId}
          passphrase={VOICE_PASSPHRASES[0]}
          guardName={assignment?.guardName || user?.fullName || 'Guardia Operativo'}
          assignment={{
            guardName: assignment?.guardName || user?.fullName || 'Desconocido',
            guardCode: assignment?.guardCode || 'SIN-CODIGO',
            geofenceName: assignment?.geofenceName || 'Geocerca no identificada',
          }}
          onSuccess={handleVoiceSuccess}
          onFail={handleVoiceFail}
        />
      </SafeAreaView>
    );
  }

  // ─── Render: End Round Report Modal ───
  if (showEndReportModal) {
    return (
      <SafeAreaView style={styles.safe}>
        <EndRoundReportModal
          visible
          assignment={assignment}
          executionId={executionId}
          currentPosition={exec.position || { lat: 0, lng: 0 }}
          onComplete={handleEndRoundComplete}
        />
      </SafeAreaView>
    );
  }

  // ─── Render: Normal Execution UI ───
  return (
    <SafeAreaView style={styles.safe}>
      {/* ─── Status Bar ─── */}
      <View style={styles.statusBar}>
        <View style={styles.statusLeft}>
          <View style={[styles.stateDot, { backgroundColor: stateColor, shadowColor: stateColor }]} />
          <Text style={[styles.timer, exec.timer.urgency === 'critical' && styles.timerCritical, exec.timer.urgency === 'overdue' && styles.timerOverdue]}>
            {exec.isActive ? exec.timer.elapsedFormatted : STATE_LABELS[exec.status as keyof typeof STATE_LABELS]}
          </Text>
        </View>

        <View style={styles.statusRight}>
          {assignment?.notes && (
            <TouchableOpacity style={styles.notesBtn} onPress={() => setShowNotes(true)} activeOpacity={0.8}>
              <Text style={styles.notesBtnText}>📋 Indicaciones</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.progressText}>{exec.progress.percentage}%</Text>
          <View style={styles.gpsBox}>
            <View style={[styles.gpsDot, gpsStatus === 'ok' && styles.gpsOk, gpsStatus === 'warn' && styles.gpsWarn, gpsStatus === 'bad' && styles.gpsBad]} />
            <Text style={styles.gpsText}>
              {exec.accuracy != null ? `±${exec.accuracy.toFixed(0)}m` : 'GPS...'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* ─── GPS Panel (placeholder del mapa) ─── */}
        <View style={styles.mapPanel}>
          <View style={styles.mapHeader}>
            <Text style={styles.mapTitle}>Posición del Guardia</Text>
            <Text style={styles.mapBadge}>LIVE</Text>
          </View>
          <View style={styles.mapBody}>
            <View style={styles.mapRadar}>
              <View style={styles.mapRadarRing} />
              <View style={[styles.mapRadarDot, exec.position && styles.mapRadarDotActive]} />
            </View>
            <View style={styles.mapCoords}>
              <Text style={styles.mapCoordsText}>
                {exec.position
                  ? `${exec.position.lat.toFixed(5)}, ${exec.position.lng.toFixed(5)}`
                  : 'Esperando GPS...'}
              </Text>
              <Text style={styles.mapTrailText}>Rastro: {exec.trail.length} puntos</Text>
            </View>
          </View>
        </View>

        {/* Next checkpoint */}
        {exec.nextCheckpoint && exec.isActive && (
          <View style={styles.nextCp}>
            <View style={styles.cpNumber}>
              <Text style={styles.cpNumberText}>{exec.nextCheckpoint.order}</Text>
            </View>
            <View style={styles.cpInfo}>
              <Text style={styles.cpName}>{exec.nextCheckpoint.name}</Text>
              <Text style={styles.cpDistance}>Siguiente checkpoint</Text>
            </View>
          </View>
        )}

        {/* Validation feedback */}
        {feedback && (
          <View style={[styles.feedback, feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError]}>
            <Text style={[styles.feedbackText, feedback.type === 'success' ? styles.feedbackTextSuccess : styles.feedbackTextError]}>
              {feedback.message}
            </Text>
          </View>
        )}

        {/* Error */}
        {exec.error && !feedback && (
          <View style={[styles.feedback, styles.feedbackError]}>
            <Text style={styles.feedbackTextError}>{exec.error}</Text>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actions}>
          {!exec.isActive && !exec.isTerminal && (
            <TouchableOpacity
              style={[styles.btn, styles.btnCheckpoint]}
              onPress={() => exec.start()}
              disabled={exec.isLoading}
              activeOpacity={0.85}
            >
              <Text style={styles.btnCheckpointText}>
                {exec.isLoading ? 'Iniciando...' : '▶ Iniciar Ronda'}
              </Text>
            </TouchableOpacity>
          )}

          {exec.isActive && !exec.isPaused && (
            <>
              <TouchableOpacity
                style={[styles.btn, styles.btnCheckpoint, (!exec.nextCheckpoint || !exec.position) && styles.btnDisabled]}
                onPress={handleCheckpoint}
                disabled={!exec.nextCheckpoint || !exec.position}
                activeOpacity={0.85}
              >
                <Text style={styles.btnCheckpointText}>📍 Registrar Checkpoint</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnPause]}
                onPress={() => exec.pause()}
                activeOpacity={0.85}
              >
                <Text style={styles.btnPauseText}>⏸</Text>
              </TouchableOpacity>
            </>
          )}

          {exec.isPaused && (
            <>
              <TouchableOpacity
                style={[styles.btn, styles.btnCheckpoint]}
                onPress={() => exec.resume()}
                activeOpacity={0.85}
              >
                <Text style={styles.btnCheckpointText}>▶ Reanudar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnCancel]}
                onPress={() => exec.cancel('Cancelada por guardia')}
                activeOpacity={0.85}
              >
                <Text style={styles.btnCancelText}>✕ Cancelar</Text>
              </TouchableOpacity>
            </>
          )}

          {exec.isTerminal && (
            <View style={styles.terminalBox}>
              <Text style={[styles.terminalText, { color: stateColor }]}>
                {STATE_LABELS[exec.status as keyof typeof STATE_LABELS]}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ─── Notes Modal ─── */}
      <NotesModal
        visible={showNotes}
        notes={assignment?.notes}
        onClose={() => setShowNotes(false)}
      />
    </SafeAreaView>
  );
}

async function requireGps(): Promise<{ lat: number; lng: number }> {
  try {
    const { getCurrentPositionAsync, Accuracy } = await import('expo-location');
    const p = await getCurrentPositionAsync({ accuracy: Accuracy.High });
    return { lat: p.coords.latitude, lng: p.coords.longitude };
  } catch {
    throw new Error('GPS requerido');
  }
}

function toMillis(ts: unknown): number | null {
  if (!ts) return null;
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'object' && ts !== null) {
    const anyTs = ts as { toMillis?: () => number };
    if (typeof anyTs.toMillis === 'function') return anyTs.toMillis();
    const seconds = (ts as { seconds?: number }).seconds;
    if (typeof seconds === 'number') return seconds * 1000;
  }
  return null;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.dark.bg,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  centerText: {
    fontSize: fontSizes.base,
    color: colors.dark.textMuted,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.dark.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stateDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
  timer: {
    fontSize: fontSizes.base,
    fontWeight: '700',
    color: colors.dark.text,
    fontVariant: ['tabular-nums'],
  },
  timerCritical: {
    color: colors.warning[400],
  },
  timerOverdue: {
    color: colors.danger[400],
  },
  statusRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  notesBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  notesBtnText: {
    fontSize: fontSizes.xs,
    color: colors.dark.text,
    fontWeight: '600',
  },
  progressText: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.primary[400],
  },
  gpsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  gpsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.dark.textMuted,
  },
  gpsOk: {
    backgroundColor: colors.accent[500],
  },
  gpsWarn: {
    backgroundColor: colors.warning[500],
  },
  gpsBad: {
    backgroundColor: colors.danger[500],
  },
  gpsText: {
    fontSize: fontSizes.xs,
    color: colors.dark.textMuted,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  mapPanel: {
    backgroundColor: colors.dark.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.dark.border,
    overflow: 'hidden',
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  mapTitle: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.dark.text,
  },
  mapBadge: {
    fontSize: fontSizes.xs,
    fontWeight: '800',
    color: colors.accent[400],
    letterSpacing: 1,
  },
  mapBody: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.lg,
  },
  mapRadar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.dark.surface,
    borderWidth: 1,
    borderColor: colors.dark.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapRadarRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: colors.primary[500] + '40',
  },
  mapRadarDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.dark.textMuted,
  },
  mapRadarDotActive: {
    backgroundColor: colors.primary[500],
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 6,
  },
  mapCoords: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  mapCoordsText: {
    fontSize: fontSizes.sm,
    color: colors.primary[300],
    fontVariant: ['tabular-nums'],
  },
  mapTrailText: {
    fontSize: fontSizes.xs,
    color: colors.dark.textMuted,
  },
  nextCp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.dark.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.primary[500] + '40',
    padding: spacing.lg,
  },
  cpNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  cpNumberText: {
    fontSize: fontSizes.lg,
    fontWeight: '800',
    color: '#ffffff',
  },
  cpInfo: {
    flex: 1,
    gap: 2,
  },
  cpName: {
    fontSize: fontSizes.base,
    fontWeight: '700',
    color: colors.dark.text,
  },
  cpDistance: {
    fontSize: fontSizes.xs,
    color: colors.dark.textMuted,
  },
  feedback: {
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  feedbackSuccess: {
    backgroundColor: colors.accent[900] + '30',
    borderColor: colors.accent[500] + '50',
  },
  feedbackError: {
    backgroundColor: colors.danger[900] + '30',
    borderColor: colors.danger[500] + '50',
  },
  feedbackText: {
    fontSize: fontSizes.sm,
  },
  feedbackTextSuccess: {
    color: colors.accent[300],
  },
  feedbackTextError: {
    color: colors.danger[300],
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  btn: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCheckpoint: {
    backgroundColor: colors.primary[600],
  },
  btnCheckpointText: {
    fontSize: fontSizes.base,
    fontWeight: '700',
    color: '#ffffff',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnPause: {
    backgroundColor: colors.warning[600],
    flex: 0.4,
  },
  btnPauseText: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: '#ffffff',
  },
  btnCancel: {
    backgroundColor: colors.danger[600],
    flex: 0.4,
  },
  btnCancelText: {
    fontSize: fontSizes.base,
    fontWeight: '700',
    color: '#ffffff',
  },
  terminalBox: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  terminalText: {
    fontSize: fontSizes.base,
    fontWeight: '700',
  },
});
