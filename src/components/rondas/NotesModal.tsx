import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Modal } from '@/components/ui/Modal';
import { colors, spacing, radii, fontSizes } from '@/constants/colors';

interface NotesModalProps {
  visible: boolean;
  notes?: string | null;
  onClose: () => void;
}

export function NotesModal({ visible, notes, onClose }: NotesModalProps) {
  return (
    <Modal
      visible={visible}
      onClose={onClose}
      containerStyle={styles.modalContainer}
    >
      <View style={styles.handle} />
      <View style={styles.header}>
        <Text style={styles.title}>📝 Indicaciones de la Ronda</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.text}>{notes || 'Sin indicaciones adicionales.'}</Text>
      </View>

      <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
        <Text style={styles.closeBtnText}>Entendido</Text>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxWidth: undefined,
    width: '100%',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
    paddingTop: spacing.md,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.dark.border,
    marginBottom: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.dark.text,
  },
  content: {
    backgroundColor: colors.dark.surface,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: radii.md,
    padding: spacing.lg,
    minHeight: 80,
  },
  text: {
    fontSize: fontSizes.base,
    color: colors.dark.text,
    lineHeight: 22,
  },
  closeBtn: {
    marginTop: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.primary[600],
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: fontSizes.base,
    fontWeight: '700',
    color: '#ffffff',
  },
});
