import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/useAuthStore';
import { subscribeToGuardAssignments } from '@/services/rondaAssignmentService';
import { RONDA_STATES, isActiveState, isTerminalState } from '@/utils/rondaStateMachine';
import { RondaCard } from '@/components/rondas/RondaCard';
import { VoiceEnrollmentModal } from '@/components/rondas/VoiceEnrollmentModal';
import { colors, spacing, radii, fontSizes } from '@/constants/colors';
import type { RondaAssignment } from '@/types';

type Filter = 'ALL' | 'PENDING' | 'COMPLETED';

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: 'ALL', label: 'Todas' },
  { key: 'PENDING', label: 'Pendientes' },
  { key: 'COMPLETED', label: 'Completadas' },
];

export default function MisRondasScreen() {
  const { user } = useAuthStore();
  const [assignments, setAssignments] = useState<RondaAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);

  const isVoiceEnrolled = user?.voiceEnrolled === true;

  useEffect(() => {
    if (!user?.uid) return;

    setLoading(true);
    const unsubscribe = subscribeToGuardAssignments(user.uid, (data) => {
      setAssignments(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const { windowed } = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const twelveHours = 12 * 60 * 60 * 1000;

    const windowedAssignments = assignments.filter((a) => {
      const start = a.scheduledStart;
      if (!start) return false;
      return start >= now - oneDay && start <= now + twelveHours;
    });

    return { windowed: windowedAssignments };
  }, [assignments]);

  const filtered = useMemo(() => {
    return windowed.filter((a) => {
      if (filter === 'ALL') return true;
      if (filter === 'PENDING') {
        return a.status === RONDA_STATES.PENDING || a.status === RONDA_STATES.AVAILABLE;
      }
      if (filter === 'COMPLETED') return isTerminalState(a.status);
      return true;
    });
  }, [windowed, filter]);

  const active = filtered.filter((a) => isActiveState(a.status));
  const pending = filtered.filter(
    (a) => a.status === RONDA_STATES.PENDING || a.status === RONDA_STATES.AVAILABLE,
  );
  const completed = filtered.filter((a) => isTerminalState(a.status));

  const hasActiveRonda = active.length > 0;

  const today = new Date().toLocaleDateString('es-BO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.primary[400]} size="large" />
          <Text style={styles.loadingText}>Cargando rondas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Mis Rondas</Text>
          <Text style={styles.date}>{today}</Text>
        </View>

        {!isVoiceEnrolled && (
          <TouchableOpacity
            style={styles.enrollmentBanner}
            onPress={() => setShowEnrollmentModal(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.enrollmentIcon}>⚠️</Text>
            <View style={styles.enrollmentTextWrap}>
              <Text style={styles.enrollmentText}>
                <Text style={styles.enrollmentStrong}>Acción Requerida: </Text>
                Registre su perfil de voz para poder iniciar rondas.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.enrollmentBtn}
              onPress={() => setShowEnrollmentModal(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.enrollmentBtnText}>Registrar</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        <View style={styles.filters}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {active.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔴 En Progreso</Text>
            {active.map((a) => (
              <RondaCard
                key={a.id}
                assignment={a}
                isVoiceEnrolled={isVoiceEnrolled}
              />
            ))}
          </View>
        )}

        {pending.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>▶ Disponibles</Text>
            {pending.map((a) => (
              <RondaCard
                key={a.id}
                assignment={a}
                hasActiveRonda={hasActiveRonda}
                isVoiceEnrolled={isVoiceEnrolled}
              />
            ))}
          </View>
        )}

        {completed.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✓ Completadas</Text>
            {completed.map((a) => (
              <RondaCard key={a.id} assignment={a} />
            ))}
          </View>
        )}

        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No hay rondas en este filtro</Text>
          </View>
        )}
      </ScrollView>

      <VoiceEnrollmentModal
        visible={showEnrollmentModal}
        onClose={() => setShowEnrollmentModal(false)}
        onSuccess={() => setShowEnrollmentModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.dark.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.xl,
    paddingBottom: spacing['4xl'],
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSizes.base,
    color: colors.dark.textMuted,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    fontSize: fontSizes['2xl'],
    fontWeight: '800',
    color: colors.dark.text,
  },
  date: {
    fontSize: fontSizes.sm,
    color: colors.dark.textMuted,
    textTransform: 'capitalize',
  },
  enrollmentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.warning[900] + '35',
    borderWidth: 1,
    borderColor: colors.warning[500] + '60',
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  enrollmentIcon: {
    fontSize: 18,
  },
  enrollmentTextWrap: {
    flex: 1,
  },
  enrollmentText: {
    fontSize: fontSizes.sm,
    color: colors.warning[200],
    lineHeight: 18,
  },
  enrollmentStrong: {
    fontWeight: '700',
    color: colors.warning[300],
  },
  enrollmentBtn: {
    backgroundColor: colors.warning[600],
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
  },
  enrollmentBtnText: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: '#ffffff',
  },
  filters: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    alignItems: 'center',
    backgroundColor: colors.dark.surface,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  filterBtnActive: {
    backgroundColor: colors.primary[600] + '25',
    borderColor: colors.primary[500],
  },
  filterText: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.dark.textMuted,
  },
  filterTextActive: {
    color: colors.primary[300],
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSizes.base,
    fontWeight: '700',
    color: colors.dark.text,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
    gap: spacing.md,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyText: {
    fontSize: fontSizes.base,
    color: colors.dark.textMuted,
  },
});
