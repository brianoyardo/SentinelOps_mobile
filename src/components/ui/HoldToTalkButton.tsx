import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radii, fontSizes } from '@/constants/colors';

interface HoldToTalkButtonProps {
  isRecording: boolean;
  disabled?: boolean;
  onStartRecord: () => void;
  onStopRecord: () => void;
}

export function HoldToTalkButton({
  isRecording,
  disabled,
  onStartRecord,
  onStopRecord,
}: HoldToTalkButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        isRecording ? styles.recording : styles.ready,
        disabled && styles.disabled,
      ]}
      onPressIn={onStartRecord}
      onPressOut={onStopRecord}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <View style={[styles.iconContainer, isRecording && styles.iconRecording]}>
        <Text style={styles.icon}>🎤</Text>
      </View>
      <Text style={[styles.label, isRecording && styles.labelRecording]}>
        {isRecording ? 'Grabando... Suelta para finalizar' : 'Mantener presionado'}
      </Text>
      {isRecording && (
        <>
          <View style={[styles.ripple, styles.ripple1]} />
          <View style={[styles.ripple, styles.ripple2]} />
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radii.lg,
    gap: spacing.md,
    overflow: 'hidden',
  },
  ready: {
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  recording: {
    backgroundColor: colors.danger[900] + '40',
    borderWidth: 2,
    borderColor: colors.danger[500],
  },
  disabled: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconRecording: {
    backgroundColor: colors.danger[600],
  },
  icon: {
    fontSize: 20,
  },
  label: {
    flex: 1,
    fontSize: fontSizes.base,
    color: colors.dark.text,
    fontWeight: '600',
  },
  labelRecording: {
    color: colors.danger[300],
  },
  ripple: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    top: '50%',
    left: -10,
    marginTop: -40,
  },
  ripple1: {
    borderColor: colors.danger[500] + '40',
  },
  ripple2: {
    borderColor: colors.danger[500] + '20',
    width: 120,
    height: 120,
    borderRadius: 60,
    marginTop: -60,
    left: -30,
  },
});
