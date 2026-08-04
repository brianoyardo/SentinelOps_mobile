import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Modal } from '@/components/ui/Modal';
import { colors, spacing, radii, fontSizes } from '@/constants/colors';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDanger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal visible={visible} onClose={onCancel}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
          <Text style={styles.cancelText}>{cancelText}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.confirmBtn, isDanger && styles.dangerBtn]}
          onPress={onConfirm}
          activeOpacity={0.7}
        >
          <Text style={[styles.confirmText, isDanger && styles.dangerText]}>
            {confirmText}
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.dark.text,
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: fontSizes.sm,
    color: colors.dark.textMuted,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.bg,
  },
  cancelText: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.dark.textMuted,
  },
  confirmBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.md,
    backgroundColor: colors.primary[600],
  },
  dangerBtn: {
    backgroundColor: colors.danger[600],
  },
  confirmText: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: '#fff',
  },
  dangerText: {
    color: '#fff',
  },
});
