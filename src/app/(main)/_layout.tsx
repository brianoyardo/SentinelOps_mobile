import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Stack, router, usePathname } from 'expo-router';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { COLLECTIONS } from '@/config/constants';
import { useAuthStore } from '@/store/useAuthStore';
import { logoutUser } from '@/services/authService';
import { ensureRequiredPermissions } from '@/services/permissionsService';
import { PanicModal } from '@/components/ui/PanicModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { colors, spacing, radii, fontSizes } from '@/constants/colors';

type PresenceStatus = 'online' | 'in_progress' | 'validating_voice';

const STATUS_LABELS: Record<PresenceStatus, string> = {
  online: 'En línea',
  in_progress: 'En ronda',
  validating_voice: 'Validando voz',
};

const STATUS_COLORS: Record<PresenceStatus, string> = {
  online: colors.accent[500],
  in_progress: colors.primary[400],
  validating_voice: colors.warning[500],
};

export default function GuardLayout() {
  const { user } = useAuthStore();
  const pathname = usePathname();
  const [showPanic, setShowPanic] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [presenceStatus, setPresenceStatus] = useState<PresenceStatus>('online');

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, COLLECTIONS.RONDA_EXECUTIONS),
      where('guardId', '==', user.uid),
      where('status', 'in', ['in_progress', 'paused', 'validating_voice']),
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const status = snapshot.docs[0].data().status as string;
          setPresenceStatus(
            status === 'validating_voice' ? 'validating_voice' : 'in_progress',
          );
        } else {
          setPresenceStatus('online');
        }
      },
      (err) => {
        console.error('[GuardLayout] Error escuchando ejecuciones activas:', err);
      },
    );

    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    ensureRequiredPermissions().catch((err) => {
      console.error('[GuardLayout] Error solicitando permisos:', err);
    });
  }, []);

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
      <View style={styles.header}>
        <View style={styles.brand}>
          <View style={styles.brandIcon}>
            <Text style={styles.brandIconText}>SO</Text>
          </View>
          <Text style={styles.brandText}>SentinelOps</Text>
        </View>

        <TouchableOpacity
          style={styles.statusPill}
          onPress={() => setShowMenu((prev) => !prev)}
          activeOpacity={0.8}
        >
          <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[presenceStatus] }]} />
          <Text style={styles.statusText}>{STATUS_LABELS[presenceStatus]}</Text>
        </TouchableOpacity>

        {showMenu && (
          <>
            <TouchableOpacity style={styles.menuOverlay} onPress={() => setShowMenu(false)} />
            <View style={styles.menu}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  setShowLogout(true);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.menuItemText}>Cerrar sesión</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.dark.bg } }}>
        <Stack.Screen name="mis-rondas" />
        <Stack.Screen name="ronda-execution" />
        <Stack.Screen name="report-incident" />
      </Stack>

      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navItem, pathname === '/(main)/mis-rondas' && styles.navItemActive]}
          onPress={() => router.push('/(main)/mis-rondas')}
        >
          <Text style={styles.navIcon}>↻</Text>
          <Text style={styles.navLabel}>Mis Rondas</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.dark.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandIconText: {
    fontSize: fontSizes.sm,
    fontWeight: '800',
    color: '#ffffff',
  },
  brandText: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.dark.text,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.dark.bg,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: radii.full,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.dark.text,
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  menu: {
    position: 'absolute',
    top: 64,
    right: spacing.lg,
    zIndex: 11,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: radii.md,
    minWidth: 180,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  menuItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  menuItemText: {
    fontSize: fontSizes.base,
    fontWeight: '600',
    color: colors.danger[400],
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
