import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { STATE_LABELS, STATE_COLORS, canBeStarted, isActiveState } from '@/utils/rondaStateMachine';
import { updateAssignmentStatus } from '@/services/rondaAssignmentService';
import { colors, spacing, radii, fontSizes } from '@/constants/colors';
import type { RondaAssignment } from '@/types';

const TEN_MINUTES = 10 * 60 * 1000;
const FIVE_MINUTES = 5 * 60 * 1000;

interface RondaCardProps {
  assignment: RondaAssignment;
  completedCheckpoints?: number;
  totalCheckpoints?: number;
  hasActiveRonda?: boolean;
  isVoiceEnrolled?: boolean;
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

function formatTime(ts: unknown): string {
  const millis = toMillis(ts);
  if (millis === null) return '--:--';
  const d = new Date(millis);
  return d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
}

export function RondaCard({
  assignment,
  completedCheckpoints = 0,
  totalCheckpoints = 0,
  hasActiveRonda = false,
  isVoiceEnrolled = true,
}: RondaCardProps) {
  const router = useRouter();
  const { status, scheduledStart, priority, rondaId, routeName, actualStart, actualEnd } = assignment;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const stateLabel = STATE_LABELS[status] || status;
  const stateColor = STATE_COLORS[status] || '#64748b';

  const progressPct =
    totalCheckpoints > 0 ? Math.round((completedCheckpoints / totalCheckpoints) * 100) : 0;

  const scheduledMillis = toMillis(scheduledStart);

  const isTooEarly =
    canBeStarted(status) && scheduledMillis !== null && now < scheduledMillis - FIVE_MINUTES;
  const isMissed =
    canBeStarted(status) && scheduledMillis !== null && now > scheduledMillis + TEN_MINUTES;
  const isLate =
    canBeStarted(status) && scheduledMillis !== null && now > scheduledMillis && !isMissed;

  useEffect(() => {
    if (isMissed && (status === 'available' || status === 'pending')) {
      updateAssignmentStatus(assignment.id, 'missed').catch(() => {});
    }
  }, [isMissed, status, assignment.id]);

  const handleAction = () => {
    router.push({
      pathname: '/ronda-execution',
      params: { assignmentId: assignment.id, startedLate: isLate ? 'true' : 'false' },
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {routeName || `Ronda #${String(rondaId ?? '').slice(-4) || '—'}`}
        </Text>
        <View style={[styles.badge, { backgroundColor: `${stateColor}22`, borderColor: `${stateColor}44` }]}>
          <Text style={[styles.badgeText, { color: stateColor }]}>{stateLabel}</Text>
        </View>
      </View>

      <View style={styles.meta}>
        {status === 'completed' && actualStart ? (
          <Text style={styles.metaItem}>
            ✅ Realizado: {formatTime(actualStart)} - {formatTime(actualEnd)}
          </Text>
        ) : (
          <Text style={styles.metaItem}>🕐 Inicio: {formatTime(scheduledStart)}</Text>
        )}
        {isLate && status !== 'completed' && (
          <Text style={[styles.priorityText, styles.priorityUrgent]}>⚠️ Fuera de horario</Text>
        )}
        {totalCheckpoints > 0 && (
          <Text style={styles.metaItem}>
            📍 {completedCheckpoints}/{totalCheckpoints} checkpoints
          </Text>
        )}
        {priority && priority !== 'normal' && (
          <Text
            style={[
              styles.priorityText,
              priority === 'urgent' ? styles.priorityUrgent : priority === 'high' ? styles.priorityHigh : null,
            ]}
          >
            {priority === 'urgent' ? '🔴 URGENTE' : priority === 'high' ? '🟠 ALTA' : ''}
          </Text>
        )}
      </View>

      {isActiveState(status) && totalCheckpoints > 0 && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
        </View>
      )}

      {canBeStarted(status) &&
        (!isVoiceEnrolled ? (
          <TouchableOpacity style={[styles.action, styles.actionLocked]} disabled>
            <Text style={styles.actionLockedText}>🎙️ Voz No Registrada</Text>
          </TouchableOpacity>
        ) : isTooEarly ? (
          <TouchableOpacity style={[styles.action, styles.actionLocked]} disabled>
            <Text style={styles.actionLockedText}>
              ⏳ Disponible a las {scheduledMillis !== null ? formatTime(scheduledMillis - FIVE_MINUTES) : '--:--'}
            </Text>
          </TouchableOpacity>
        ) : isMissed ? (
          <TouchableOpacity style={[styles.action, styles.actionLocked]} disabled>
            <Text style={styles.actionLockedText}>🚫 Ronda Vencida (No Cumplida)</Text>
          </TouchableOpacity>
        ) : hasActiveRonda ? (
          <TouchableOpacity style={[styles.action, styles.actionLocked]} disabled>
            <Text style={styles.actionLockedText}>🔒 Ya tienes una ronda en curso</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.action, styles.actionStart]} onPress={handleAction} activeOpacity={0.85}>
            <Text style={styles.actionStartText}>▶ Iniciar Ronda</Text>
          </TouchableOpacity>
        ))}

      {(status === 'paused' || status === 'in_progress') && (
        <TouchableOpacity style={[styles.action, styles.actionResume]} onPress={handleAction} activeOpacity={0.85}>
          <Text style={styles.actionResumeText}>▶ Continuar Ronda</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: {
    flex: 1,
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.dark.text,
  },
  badge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
  },
  metaItem: {
    fontSize: fontSizes.sm,
    color: colors.dark.textMuted,
  },
  priorityText: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
  },
  priorityUrgent: {
    color: colors.danger[400],
  },
  priorityHigh: {
    color: colors.warning[400],
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.dark.surface,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.accent[500],
  },
  action: {
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLocked: {
    backgroundColor: colors.dark.surface,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  actionLockedText: {
    fontSize: fontSizes.sm,
    color: colors.dark.textMuted,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionStart: {
    backgroundColor: colors.primary[600],
  },
  actionStartText: {
    fontSize: fontSizes.base,
    fontWeight: '700',
    color: '#ffffff',
  },
  actionResume: {
    backgroundColor: colors.accent[600],
  },
  actionResumeText: {
    fontSize: fontSizes.base,
    fontWeight: '700',
    color: '#ffffff',
  },
});
