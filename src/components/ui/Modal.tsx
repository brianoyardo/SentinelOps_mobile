import { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Animated,
  Modal as RNModal,
  KeyboardAvoidingView,
  Platform,
  type ViewStyle,
} from 'react-native';
import { colors, spacing } from '@/constants/colors';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  containerStyle?: ViewStyle;
}

export function Modal({ visible, onClose, children, containerStyle }: ModalProps) {
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.95);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim]);

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        pointerEvents="box-none"
      >
        <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
          <Pressable style={styles.overlayPress} onPress={onClose} />
        </Animated.View>
        <Animated.View
          style={[
            styles.content,
            containerStyle,
            { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  overlayPress: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: 16,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 48,
    elevation: 24,
  },
});
