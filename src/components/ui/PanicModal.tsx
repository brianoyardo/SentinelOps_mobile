import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Modal } from '@/components/ui/Modal';
import { colors, spacing, radii, fontSizes } from '@/constants/colors';

interface PanicModalProps {
  visible: boolean;
  isSending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PanicModal({ visible, isSending, onConfirm, onCancel }: PanicModalProps) {
  const [sent, setSent] = useState(false);

  const handleConfirm = async () => {
    await onConfirm();
    setSent(true);
    setTimeout(() => {
      setSent(false);
      onCancel();
    }, 2000);
  };

  return (
    <Modal visible={visible} onClose={onCancel}>
      {sent ? (
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>🚨</Text>
          <Text style={styles.title}>Alerta Enviada</Text>
          <Text style={styles.message}>Mantén la calma. Ayuda en camino.</Text>
        </View>
      ) : (
        <>
          <Text style={styles.panicIcon}>⚠</Text>
          <Text style={styles.title}>¿Activar Alerta de Emergencia?</Text>
          <Text style={styles.message}>
            Se enviará tu ubicación exacta al centro de comando. Esta acción queda registrada para auditoría.
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, isSending && styles.sendingBtn]}
              onPress={handleConfirm}
              disabled={isSending}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmText}>
                {isSending ? 'Enviando...' : 'Confirmar'}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  panicIcon: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: spacing.sm,
    color: colors.danger[500],
  },
  successContainer: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  successIcon: {
    fontSize: 48,
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.danger[400],
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  message: {
    fontSize: fontSizes.sm,
    color: colors.dark.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.dark.textMuted,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.danger[600],
    alignItems: 'center',
  },
  sendingBtn: {
    opacity: 0.6,
  },
  confirmText: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: '#fff',
  },
});
