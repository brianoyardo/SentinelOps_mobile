import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Stack, router, usePathname } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
import { logoutUser } from '@/services/authService';
import { PanicModal } from '@/components/ui/PanicModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { colors, spacing, radii, fontSizes } from '@/constants/colors';

export default function GuardLayout() {
  const { user } = useAuthStore();
  const pathname = usePathname();
  const [showPanic, setShowPanic] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleLogout = async () => {
    await logoutUser();
    router.replace('/(auth)/login');
  };

  const handlePanic = async () => {
    setIsSending(true);
    try {
      const { sendPanicAlert } = await import('@/services/sosAlertService');
      await sendPanicAlert({
        type: 'panic',
        timestamp: Date.now(),
        guardId: user?.uid,
        guardName: user?.fullName,
        guardCode: user?.guardId ?? undefined,
      });
    } catch {
      // Modal muestra estado success de todas formas
    } finally {
      setIsSending(false);
    }
  };

  return (
    <View style={styles.layout}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.dark.bg } }}>
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="ronda-execution" />
        <Stack.Screen name="report-incident" />
      </Stack>

      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navItem, pathname === '/(main)/dashboard' && styles.navItemActive]}
          onPress={() => router.push('/(main)/dashboard')}
        >
          <Text style={styles.navIcon}>▦</Text>
          <Text style={styles.navLabel}>Inicio</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.panicOuter}
          onPress={() => setShowPanic(true)}
          activeOpacity={0.9}
        >
          <View style={styles.panicButton}>
            <Text style={styles.panicText}>🚨</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, pathname === '/(main)/report-incident' && styles.navItemActive]}
          onPress={() => router.push('/(main)/report-incident')}
        >
          <Text style={styles.navIcon}>⚠</Text>
          <Text style={styles.navLabel}>Reportar</Text>
        </TouchableOpacity>
      </View>

      <PanicModal
        visible={showPanic}
        isSending={isSending}
        onConfirm={handlePanic}
        onCancel={() => setShowPanic(false)}
      />

      <ConfirmModal
        visible={showLogout}
        title="Cerrar Sesión"
        message="¿Estás seguro de que deseas salir?"
        confirmText="Salir"
        isDanger
        onConfirm={handleLogout}
        onCancel={() => setShowLogout(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  layout: {
    flex: 1,
    backgroundColor: colors.dark.bg,
  },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.dark.surface,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
    paddingBottom: spacing.sm,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  navItem: {
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
  },
  navItemActive: {
    backgroundColor: colors.primary[500] + '15',
  },
  navIcon: {
    fontSize: 20,
  },
  navLabel: {
    fontSize: fontSizes.xs,
    color: colors.dark.textMuted,
    fontWeight: '600',
  },
  panicOuter: {
    marginTop: -24,
  },
  panicButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.danger[600],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.danger[400],
  },
  panicText: {
    fontSize: 24,
  },
});
