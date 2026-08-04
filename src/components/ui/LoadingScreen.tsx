import { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import { colors, fontSizes, spacing } from '@/constants/colors';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Cargando sistema...' }: LoadingScreenProps) {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [rotateAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>SentinelOps</Text>

      <View style={styles.radar}>
        <View style={[styles.ring, styles.ringOuter]} />
        <View style={[styles.ring, styles.ringInner]} />
        <Animated.View style={[styles.sweep, { transform: [{ rotate: spin }] }]} />
        <View style={styles.dot} />
      </View>

      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.bg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing['2xl'],
  },
  brand: {
    fontSize: fontSizes['3xl'],
    fontWeight: '700',
    color: colors.primary[500],
    letterSpacing: 4,
  },
  radar: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
  },
  ringOuter: {
    width: 120,
    height: 120,
    borderColor: colors.primary[800],
  },
  ringInner: {
    width: 80,
    height: 80,
    borderColor: colors.primary[700],
  },
  sweep: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: colors.primary[500],
    borderRadius: 999,
    top: 30,
    left: 30,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary[400],
  },
  text: {
    fontSize: fontSizes.sm,
    color: colors.dark.textMuted,
  },
});
