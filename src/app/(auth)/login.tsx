import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { loginUser } from '@/services/authService';
import { useAuthStore } from '@/store/useAuthStore';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { colors, spacing, radii, fontSizes } from '@/constants/colors';

const { width: W, height: H } = Dimensions.get('window');

function NeuralCanvas() {
  const canvasRef = useRef<View>(null);

  useEffect(() => {
    const nodes: Array<{
      x: Animated.Value;
      y: Animated.Value;
      vx: number;
      vy: number;
    }> = [];

    for (let i = 0; i < 30; i++) {
      nodes.push({
        x: new Animated.Value(Math.random() * W),
        y: new Animated.Value(Math.random() * H),
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
      });
    }

    const anim = () => {
      for (const n of nodes) {
        const newX = Math.max(0, Math.min(W, (n.x as any).__getValue() + n.vx));
        const newY = Math.max(0, Math.min(H, (n.y as any).__getValue() + n.vy));
        n.x.setValue(newX);
        n.y.setValue(newY);
        if (newX <= 0 || newX >= W) n.vx *= -1;
        if (newY <= 0 || newY >= H) n.vy *= -1;
      }
      Animated.timing(new Animated.Value(0), {
        toValue: 1,
        duration: 50,
        useNativeDriver: false,
      }).start(anim);
    };

    anim();

    return () => {};
  }, []);

  return <View ref={canvasRef} style={StyleSheet.absoluteFill} pointerEvents="none" />;
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const { setUser, setToken } = useAuthStore();

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Ingrese email y contraseña');
      setShowErrorModal(true);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await loginUser(email.trim(), password);
      router.replace('/(main)/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error de autenticación';
      setError(message);
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Autenticando..." />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <NeuralCanvas />
      <View style={styles.vignette} pointerEvents="none" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          <View style={styles.brand}>
            <Text style={styles.shield}>SO</Text>
            <Text style={styles.brandName}>SentinelOps</Text>
            <Text style={styles.tagline}>Monitoreo de Seguridad en Tiempo Real</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Correo Electrónico</Text>
              <View style={styles.fieldWrapper}>
                <Text style={styles.fieldIcon}>✉</Text>
                <TextInput
                  style={styles.input}
                  placeholder="operador@sentinel.ops"
                  placeholderTextColor={colors.dark.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Contraseña</Text>
              <View style={styles.fieldWrapper}>
                <Text style={styles.fieldIcon}>🔒</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={colors.dark.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="current-password"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.forgot}>
              <Text style={styles.forgotText}>Olvidé mi contraseña</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              activeOpacity={0.8}
            >
              <Text style={styles.submitText}>Ingresar</Text>
            </TouchableOpacity>

            <View style={styles.status}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Sistema operativo</Text>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={showErrorModal}
        title="Error de autenticación"
        message={error}
        confirmText="OK"
        onConfirm={() => setShowErrorModal(false)}
        onCancel={() => setShowErrorModal(false)}
        isDanger
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.dark.bg,
  },
  flex: {
    flex: 1,
  },
  vignette: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing['3xl'],
  },
  brand: {
    alignItems: 'center',
  },
  shield: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.primary[400],
    width: 64,
    height: 64,
    textAlign: 'center',
    lineHeight: 64,
    borderWidth: 2,
    borderColor: colors.primary[500],
    borderRadius: 16,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  brandName: {
    fontSize: fontSizes['3xl'],
    fontWeight: '700',
    color: colors.primary[400],
    letterSpacing: 3,
  },
  tagline: {
    fontSize: fontSizes.sm,
    color: colors.dark.textMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.dark.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  field: {
    gap: spacing.sm,
  },
  fieldLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.dark.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  fieldWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.surface,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
  },
  fieldIcon: {
    fontSize: 14,
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: fontSizes.base,
    color: colors.dark.text,
  },
  eyeBtn: {
    padding: spacing.sm,
  },
  eyeIcon: {
    fontSize: 16,
  },
  forgot: {
    alignSelf: 'flex-end',
  },
  forgotText: {
    fontSize: fontSizes.xs,
    color: colors.primary[400],
  },
  submitBtn: {
    backgroundColor: colors.primary[600],
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  submitText: {
    fontSize: fontSizes.base,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 2,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent[500],
  },
  statusText: {
    fontSize: fontSizes.xs,
    color: colors.dark.textMuted,
  },
});
