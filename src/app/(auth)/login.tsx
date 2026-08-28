/**
 * SentinelOps Mobile — Login Screen
 *
 * Réplica fiel de la identidad visual del login web de SentinelOps:
 *  • Fondo animado de partículas (nodos + conexiones) — Animated API de RN
 *  • Logo SVG escudo-ojo — dibujado con View + bordas + posicionamiento absoluto
 *  • Tagline typewriter — ciclo animado con useState + useEffect
 *  • Íconos SVG vectoriales inline — dibujados con View borderRadius
 *  • Card glassmorphism con blur (expo-glass-effect si disponible)
 *  • Paleta idéntica al web: azul primary #3b82f6, fondo #0a0f1e
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { loginUser } from '@/services/authService';
import { useAuthStore } from '@/store/useAuthStore';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

const { width: W, height: H } = Dimensions.get('window');

// ─── Colores alineados con el design system web ─────────────────────────────
const C = {
  bg: '#0a0f1e',
  surface: '#111827',
  card: '#0d1626',
  border: '#1e2d4a',
  primary: '#3b82f6',
  primaryDim: 'rgba(59,130,246,0.18)',
  primaryBright: '#60a5fa',
  text: '#f1f5f9',
  textMuted: '#64748b',
  accent: '#10b981',
  danger: '#ef4444',
};

// ─── Typewriter hook ─────────────────────────────────────────────────────────
const PHRASES = [
  'Monitoreo de Seguridad en Tiempo Real',
  'Plataforma Operativa Geoespacial',
  'Control de Rondas y Checkpoints',
  'Sistema Táctico de Vigilancia',
];

function useTypewriter() {
  const [display, setDisplay] = useState('');
  const phraseIdx = useRef(0);
  const charIdx = useRef(0);
  const deleting = useRef(false);

  useEffect(() => {
    const tick = () => {
      const phrase = PHRASES[phraseIdx.current];
      if (!deleting.current) {
        charIdx.current += 1;
        setDisplay(phrase.slice(0, charIdx.current));
        if (charIdx.current === phrase.length) {
          deleting.current = true;
          return 1800; // pausa al completar
        }
        return 45;
      } else {
        charIdx.current -= 1;
        setDisplay(phrase.slice(0, charIdx.current));
        if (charIdx.current === 0) {
          deleting.current = false;
          phraseIdx.current = (phraseIdx.current + 1) % PHRASES.length;
          return 400; // pausa antes de nueva frase
        }
        return 22;
      }
    };

    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const delay = tick();
      timer = setTimeout(schedule, delay ?? 45);
    };
    timer = setTimeout(schedule, 600);
    return () => clearTimeout(timer);
  }, []);

  return display;
}

// ─── Fondo de partículas animadas (réplica del canvas neural de la web) ──────
interface Particle {
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  vx: number;
  vy: number;
  cx: number; // valor actual x (para cálculo de distancia)
  cy: number;
}

function NeuralBackground() {
  const particles = useRef<Particle[]>([]);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Inicializamos 25 partículas
  if (particles.current.length === 0) {
    for (let i = 0; i < 25; i++) {
      const cx = Math.random() * W;
      const cy = Math.random() * H;
      particles.current.push({
        x: new Animated.Value(cx),
        y: new Animated.Value(cy),
        opacity: new Animated.Value(Math.random() * 0.5 + 0.2),
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        cx,
        cy,
      });
    }
  }

  useEffect(() => {
    const step = () => {
      for (const p of particles.current) {
        p.cx += p.vx;
        p.cy += p.vy;
        if (p.cx <= 0 || p.cx >= W) p.vx *= -1;
        if (p.cy <= 0 || p.cy >= H) p.vy *= -1;
        p.x.setValue(p.cx);
        p.y.setValue(p.cy);
      }
      frameRef.current = setTimeout(step, 50);
    };
    frameRef.current = setTimeout(step, 50);
    return () => {
      if (frameRef.current) clearTimeout(frameRef.current);
    };
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.current.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.particle,
            {
              left: p.x,
              top: p.y,
              opacity: p.opacity,
            },
          ]}
        />
      ))}
    </View>
  );
}

// ─── Logo Escudo-Ojo (sin react-native-svg) ───────────────────────────────────
function ShieldLogo() {
  return (
    <View style={styles.shieldWrapper}>
      {/* Cuerpo del escudo */}
      <View style={styles.shieldOuter}>
        <View style={styles.shieldInner}>
          {/* Ojo: elipse horizontal = View con borderRadius + overflow */}
          <View style={styles.eyeOuter}>
            {/* Iris/pupila */}
            <View style={styles.eyePupil} />
          </View>
        </View>
      </View>
      {/* Brillo superior */}
      <View style={styles.shieldGlow} />
    </View>
  );
}

// ─── Íconos SVG como Views ────────────────────────────────────────────────────
function IconMail() {
  return (
    <View style={styles.iconWrapper}>
      {/* Sobre */}
      <View style={styles.iconMailRect} />
      <View style={styles.iconMailV} />
    </View>
  );
}

function IconLock() {
  return (
    <View style={styles.iconWrapper}>
      <View style={styles.iconLockBody} />
      <View style={styles.iconLockArch} />
    </View>
  );
}

function IconEye({ crossed }: { crossed?: boolean }) {
  return (
    <View style={styles.iconWrapper}>
      <View style={styles.iconEyeOuter} />
      <View style={styles.iconEyeInner} />
      {crossed && <View style={styles.iconEyeCross} />}
    </View>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────
export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const [error, setError] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const { setUser, setToken } = useAuthStore();
  const tagline = useTypewriter();

  // Animación de entrada del card
  const cardAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(cardAnim, {
      toValue: 1,
      duration: 700,
      delay: 200,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      setError('Ingrese su correo electrónico y contraseña');
      setShowErrorModal(true);
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await loginUser(email.trim(), password);
      router.replace('/(main)/mis-rondas');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error de autenticación';
      setError(message);
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  }, [email, password]);

  if (isLoading) return <LoadingScreen message="Autenticando..." />;

  const cardStyle = {
    opacity: cardAnim,
    transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [32, 0] }) }],
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Fondo de partículas */}
      <NeuralBackground />

      {/* Vignette oscuro */}
      <View style={styles.vignette} pointerEvents="none" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View style={[styles.container, cardStyle]}>

          {/* ─── Brand ─── */}
          <View style={styles.brand}>
            <ShieldLogo />
            <Text style={styles.brandName}>SentinelOps</Text>
            <View style={styles.taglineRow}>
              <Text style={styles.tagline}>{tagline}</Text>
              <Text style={styles.cursor}>|</Text>
            </View>
          </View>

          {/* ─── Card ─── */}
          <View style={styles.card}>

            {/* Email */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Correo Electrónico</Text>
              <View style={[styles.fieldWrapper, emailFocused && styles.fieldWrapperFocused]}>
                <IconMail />
                <TextInput
                  style={styles.input}
                  placeholder="operador@sentinel.ops"
                  placeholderTextColor={C.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Contraseña</Text>
              <View style={[styles.fieldWrapper, passFocused && styles.fieldWrapperFocused]}>
                <IconLock />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={C.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setPassFocused(true)}
                  onBlur={() => setPassFocused(false)}
                  secureTextEntry={!showPassword}
                  autoComplete="current-password"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  <IconEye crossed={showPassword} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot */}
            <TouchableOpacity style={styles.forgotRow} activeOpacity={0.7}>
              <Text style={styles.forgotText}>Olvidé mi contraseña</Text>
            </TouchableOpacity>

            {/* Submit */}
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              activeOpacity={0.85}
            >
              <Text style={styles.submitText}>Ingresar</Text>
            </TouchableOpacity>

            {/* System status */}
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Sistema operativo</Text>
            </View>
          </View>

          {/* Footer */}
          <Text style={styles.footer}>
            © {new Date().getFullYear()} SentinelOps · Todos los derechos reservados
          </Text>
        </Animated.View>
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

// ─── Estilos ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },

  vignette: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },

  // Partícula
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(96,165,250,0.55)',
    marginLeft: -2,
    marginTop: -2,
  },

  // ─── Layout ───
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 32,
  },

  // ─── Brand ───
  brand: { alignItems: 'center', gap: 12 },

  shieldWrapper: {
    width: 72,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldOuter: {
    width: 64,
    height: 72,
    borderWidth: 2,
    borderColor: C.primary,
    borderRadius: 12,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    backgroundColor: 'rgba(15,30,60,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  shieldInner: {
    width: 50,
    height: 56,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.3)',
    borderRadius: 8,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeOuter: {
    width: 28,
    height: 18,
    borderWidth: 1.8,
    borderColor: C.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyePupil: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: C.primary,
  },
  shieldGlow: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: 2,
    backgroundColor: C.primary,
    borderRadius: 1,
    opacity: 0.6,
  },

  brandName: {
    fontSize: 30,
    fontWeight: '800',
    color: C.primaryBright,
    letterSpacing: 3,
  },
  taglineRow: {
    flexDirection: 'row',
    height: 20,
  },
  tagline: {
    fontSize: 13,
    color: C.textMuted,
  },
  cursor: {
    fontSize: 13,
    color: C.primaryBright,
    opacity: 0.8,
  },

  // ─── Card ───
  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 24,
    gap: 18,
  },

  // ─── Fields ───
  field: { gap: 8 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  fieldWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  fieldWrapperFocused: {
    borderColor: C.primary,
    backgroundColor: 'rgba(59,130,246,0.06)',
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: C.text,
  },
  eyeBtn: { padding: 8 },

  // ─── Icon views (inline SVG simulation) ───
  iconWrapper: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Mail icon
  iconMailRect: {
    position: 'absolute',
    width: 16,
    height: 12,
    borderWidth: 1.5,
    borderColor: C.textMuted,
    borderRadius: 2,
  },
  iconMailV: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 16,
    height: 7,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    borderBottomWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: 'transparent',
    borderBottomColor: C.textMuted,
    transform: [{ rotate: '0deg' }],
  },
  // Lock icon
  iconLockBody: {
    position: 'absolute',
    bottom: 0,
    width: 14,
    height: 9,
    borderWidth: 1.5,
    borderColor: C.textMuted,
    borderRadius: 2,
  },
  iconLockArch: {
    position: 'absolute',
    top: 0,
    width: 8,
    height: 8,
    borderWidth: 1.5,
    borderColor: C.textMuted,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomWidth: 0,
  },
  // Eye icon
  iconEyeOuter: {
    width: 16,
    height: 10,
    borderWidth: 1.5,
    borderColor: C.textMuted,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEyeInner: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: C.textMuted,
  },
  iconEyeCross: {
    position: 'absolute',
    width: 18,
    height: 1.5,
    backgroundColor: C.textMuted,
    transform: [{ rotate: '45deg' }],
  },

  // ─── Forgot ───
  forgotRow: { alignSelf: 'flex-end' },
  forgotText: { fontSize: 12, color: C.primary },

  // ─── Submit ───
  submitBtn: {
    backgroundColor: C.primary,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  submitText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // ─── Status ───
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: C.accent,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  statusText: { fontSize: 12, color: C.textMuted },

  // ─── Footer ───
  footer: {
    fontSize: 11,
    color: C.textMuted,
    textAlign: 'center',
    opacity: 0.6,
  },
});
