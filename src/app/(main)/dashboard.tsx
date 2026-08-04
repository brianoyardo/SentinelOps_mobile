import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, spacing, radii, fontSizes } from '@/constants/colors';

export default function DashboardScreen() {
  const { user } = useAuthStore();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Hola, {user?.fullName ?? 'Guardia'}</Text>
              <Text style={styles.role}>
                {user?.role === 'guard' ? 'Guardia de Seguridad' : user?.role ?? ''}
              </Text>
            </View>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>En línea</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.startRound}
          onPress={() => router.push('/(main)/ronda-execution')}
          activeOpacity={0.85}
        >
          <View style={styles.startRoundContent}>
            <Text style={styles.startRoundIcon}>↻</Text>
            <View style={styles.startRoundText}>
              <Text style={styles.startRoundTitle}>Iniciar Ronda</Text>
              <Text style={styles.startRoundSub}>Marcar asistencia y comenzar patrullaje</Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.quickGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(main)/report-incident')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionIcon}>⚠</Text>
            <Text style={styles.actionLabel}>Reportar Incidente</Text>
          </TouchableOpacity>

          <View style={styles.actionCard}>
            <Text style={styles.actionIcon}>🗺</Text>
            <Text style={styles.actionLabel}>Mi Ubicación</Text>
            <Text style={styles.actionSub}>Próximamente</Text>
          </View>
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Resumen del Día</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Rondas</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Checkpoints</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>--:--</Text>
              <Text style={styles.statLabel}>Tiempo</Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
  header: {
    marginBottom: spacing.sm,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: fontSizes['2xl'],
    fontWeight: '700',
    color: colors.dark.text,
  },
  role: {
    fontSize: fontSizes.sm,
    color: colors.dark.textMuted,
    marginTop: spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent[500] + '15',
    borderRadius: radii.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent[500],
  },
  statusText: {
    fontSize: fontSizes.xs,
    color: colors.accent[400],
    fontWeight: '600',
  },
  startRound: {
    backgroundColor: colors.dark.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.primary[500] + '30',
    overflow: 'hidden',
  },
  startRoundContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
    backgroundColor: colors.primary[500] + '08',
  },
  startRoundIcon: {
    fontSize: 36,
    color: colors.primary[400],
  },
  startRoundText: {
    flex: 1,
  },
  startRoundTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.dark.text,
  },
  startRoundSub: {
    fontSize: fontSizes.xs,
    color: colors.dark.textMuted,
    marginTop: spacing.xs,
  },
  quickGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.dark.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionIcon: {
    fontSize: 28,
  },
  actionLabel: {
    fontSize: fontSizes.sm,
    color: colors.dark.text,
    textAlign: 'center',
    fontWeight: '600',
  },
  actionSub: {
    fontSize: fontSizes.xs,
    color: colors.dark.textMuted,
  },
  statsCard: {
    backgroundColor: colors.dark.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  statsTitle: {
    fontSize: fontSizes.base,
    fontWeight: '600',
    color: colors.dark.text,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  stat: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    fontSize: fontSizes['2xl'],
    fontWeight: '700',
    color: colors.primary[400],
  },
  statLabel: {
    fontSize: fontSizes.xs,
    color: colors.dark.textMuted,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.dark.border,
  },
});
