import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { COLLECTIONS } from '@/config/constants';
import { useAuthStore } from '@/store/useAuthStore';
import { createIncident } from '@/services/incidentService';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { colors, spacing, radii, fontSizes } from '@/constants/colors';
import type { IncidentType, IncidentSeverity } from '@/types';

const INCIDENT_TYPES: { label: string; value: IncidentType }[] = [
  { label: 'Seguridad', value: 'security' },
  { label: 'Mantenimiento', value: 'maintenance' },
  { label: 'Emergencia', value: 'emergency' },
  { label: 'Observación', value: 'observation' },
];

const SEVERITY_LEVELS: { label: string; value: IncidentSeverity; color: string }[] = [
  { label: 'Baja', value: 'low', color: colors.accent[500] },
  { label: 'Media', value: 'medium', color: colors.warning[500] },
  { label: 'Alta', value: 'high', color: colors.warning[700] },
  { label: 'Crítica', value: 'critical', color: colors.danger[500] },
];

export default function ReportIncidentScreen() {
  const { user } = useAuthStore();
  const [description, setDescription] = useState('');
  const [type, setType] = useState<IncidentType>('security');
  const [severity, setSeverity] = useState<IncidentSeverity>('medium');
  const [evidence, setEvidence] = useState<Array<{ uri: string; name: string; mimeType: string }>>([]);
  const [showCamera, setShowCamera] = useState(false);
  
  const [activeExec, setActiveExec] = useState<any>(null);
  const [locationObj, setLocationObj] = useState<Location.LocationObject | null>(null);
  
  const [submitPhase, setSubmitPhase] = useState<'idle' | 'uploading' | 'sending' | 'done' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);

  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, COLLECTIONS.RONDA_EXECUTIONS),
      where('guardId', '==', user.uid),
      where('status', 'in', ['in_progress', 'paused', 'validating_voice'])
    );
    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setActiveExec({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setActiveExec(null);
      }
    });
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          setLocationObj(loc);
        }
      } catch (e) {
        console.warn('GPS Error', e);
      }
    })();
  }, []);

  const takePicture = useCallback(async () => {
    if (!cameraPermission?.granted) {
      await requestCameraPermission();
    }
    setShowCamera(true);
  }, [cameraPermission, requestCameraPermission]);

  const handleCameraCapture = useCallback(async () => {
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      mediaTypes: ['images'],
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setEvidence((prev) => [
        ...prev,
        {
          uri: asset.uri,
          name: `evidencia_${Date.now()}.jpg`,
          mimeType: asset.mimeType ?? 'image/jpeg',
        },
      ]);
    }
    setShowCamera(false);
  }, []);

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.8,
      mediaTypes: ['images'],
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setEvidence((prev) => [
        ...prev,
        {
          uri: asset.uri,
          name: `evidencia_${Date.now()}.${asset.uri.split('.').pop() ?? 'jpg'}`,
          mimeType: asset.mimeType ?? 'image/jpeg',
        },
      ]);
    }
  }, []);

  const removeEvidence = (index: number) => {
    setEvidence(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setSubmitPhase('uploading');
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 85) {
          clearInterval(progressInterval);
          return 85;
        }
        return prev + (evidence.length > 0 ? 8 : 15);
      });
    }, 200);

    const typeLabel = INCIDENT_TYPES.find(t => t.value === type)?.label ?? 'Incidente';
    const autoTitle = `Reporte ${typeLabel} - ${new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}`;

    try {
      setSubmitPhase('sending');
      let locationToSave = null;
      if (locationObj) {
         locationToSave = { lat: locationObj.coords.latitude, lng: locationObj.coords.longitude };
      }

      await createIncident({
        title: autoTitle,
        description: description.trim(),
        type,
        severity,
        reportedBy: user?.uid ?? '',
        guardName: user?.fullName ?? '',
        guardCode: user?.guardId ?? '',
        location: locationToSave,
        evidenceUris: evidence,
        rondaId: activeExec?.rondaId || activeExec?.routeId || null,
        executionId: activeExec?.id || null,
        routeId: activeExec?.routeId || activeExec?.rondaId || null,
        routeName: activeExec?.routeName || null,
        geofenceName: activeExec?.geofenceName || null,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);
      setSubmitPhase('done');
      
      setTimeout(() => {
         router.replace('/(main)/mis-rondas');
      }, 1200);
      
    } catch (err) {
      clearInterval(progressInterval);
      setSubmitPhase('error');
      setUploadProgress(0);
      setErrorMessage(err instanceof Error ? err.message : 'Error al reportar');
      setShowError(true);
    }
  };

  const isProcessing = submitPhase === 'uploading' || submitPhase === 'sending';

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Reportar Incidente</Text>
              <Text style={styles.subtitle}>Envío rápido geo-referenciado</Text>
            </View>
            {activeExec && (
              <View style={styles.activeBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.activeBadgeText}>Ronda Activa</Text>
              </View>
            )}
          </View>

          {(submitPhase !== 'idle' && submitPhase !== 'error') && (
            <View style={styles.progressWrap}>
              <View style={styles.progressBar}>
                 <View style={[
                   styles.progressFill, 
                   { width: `${uploadProgress}%` }, 
                   submitPhase === 'done' && styles.progressFillDone
                 ]} />
              </View>
              <Text style={styles.progressLabel}>
                {submitPhase === 'uploading' && evidence.length > 0 && `Subiendo ${evidence.length} foto(s)...`}
                {submitPhase === 'sending' && 'Enviando al Centro de Comando...'}
                {submitPhase === 'done' && '✓ Reporte enviado exitosamente'}
              </Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Tipo de Incidente</Text>
            <CustomSelect
              value={type}
              onChange={(v) => setType(v as IncidentType)}
              options={INCIDENT_TYPES}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Severidad</Text>
            <View style={styles.chips}>
              {SEVERITY_LEVELS.map((s) => (
                <TouchableOpacity
                  key={s.value}
                  style={[
                    styles.chip,
                    severity === s.value && { borderColor: s.color, backgroundColor: s.color + '20' },
                  ]}
                  onPress={() => setSeverity(s.value)}
                  disabled={isProcessing}
                >
                  <Text style={[styles.chipText, severity === s.value && { color: s.color, fontWeight: '700' }]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Descripción</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describa los detalles del incidente..."
              placeholderTextColor={colors.dark.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              editable={!isProcessing && submitPhase !== 'done'}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Evidencia Fotográfica</Text>
            {evidence.length > 0 && (
              <View style={styles.evidenceList}>
                {evidence.map((ev, i) => (
                  <View key={i} style={styles.evidenceThumbWrap}>
                    <Image source={{ uri: ev.uri }} style={styles.evidenceThumb} />
                    <TouchableOpacity 
                      style={styles.evidenceRemove} 
                      onPress={() => removeEvidence(i)}
                      disabled={isProcessing}
                    >
                      <Text style={styles.evidenceRemoveText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            <View style={styles.evidenceActions}>
              <TouchableOpacity style={styles.evidenceBtn} onPress={handleCameraCapture} activeOpacity={0.7} disabled={isProcessing}>
                <Text style={styles.evidenceBtnIcon}>📸</Text>
                <Text style={styles.evidenceBtnText}>Cámara</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.evidenceBtn} onPress={pickImage} activeOpacity={0.7} disabled={isProcessing}>
                <Text style={styles.evidenceBtnIcon}>🖼</Text>
                <Text style={styles.evidenceBtnText}>Galería</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.gpsStatus}>
            <View style={[styles.gpsDot, locationObj?.coords?.accuracy && locationObj.coords.accuracy <= 30 ? styles.gpsOk : styles.gpsWarn]} />
            <Text style={styles.gpsText}>
              {locationObj?.coords?.accuracy ? `GPS: ±${locationObj.coords.accuracy.toFixed(0)}m de precisión` : 'Obteniendo señal GPS...'}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.submit, 
              (isProcessing || submitPhase === 'done') && styles.submitDisabled,
              submitPhase === 'done' && styles.submitDone
            ]}
            onPress={handleSubmit}
            disabled={isProcessing || submitPhase === 'done'}
            activeOpacity={0.8}
          >
            {submitPhase === 'done' ? (
               <Text style={styles.submitText}>✓ REPORTE ENVIADO</Text>
            ) : isProcessing ? (
              <View style={styles.rowCenter}>
                 <ActivityIndicator color="#fff" />
                 <Text style={[styles.submitText, { marginLeft: 8 }]}>ENVIANDO...</Text>
              </View>
            ) : (
              <Text style={styles.submitText}>📡 ENVIAR AL CENTRO DE COMANDO</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={showError}
        title="Error"
        message={errorMessage}
        confirmText="OK"
        isDanger
        onConfirm={() => setShowError(false)}
        onCancel={() => setShowError(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.dark.bg },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.xl, paddingBottom: spacing['4xl'] },
  
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: { fontSize: fontSizes['2xl'], fontWeight: '800', color: colors.dark.text },
  subtitle: { fontSize: fontSizes.sm, color: colors.dark.textMuted, marginTop: 4 },
  
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.danger[900] + '40',
    borderWidth: 1,
    borderColor: colors.danger[500] + '80',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.full,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.danger[400],
  },
  activeBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.danger[300],
  },

  progressWrap: {
    gap: spacing.xs,
    backgroundColor: colors.dark.surface,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.dark.bg,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary[500],
  },
  progressFillDone: {
    backgroundColor: colors.accent[500],
  },
  progressLabel: {
    fontSize: fontSizes.xs,
    color: colors.dark.textMuted,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },

  field: { gap: spacing.sm },
  fieldLabel: { fontSize: fontSizes.xs, fontWeight: '700', color: colors.dark.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  input: {
    backgroundColor: colors.dark.surface,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: radii.md,
    padding: spacing.lg,
    fontSize: fontSizes.base,
    color: colors.dark.text,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.surface,
  },
  chipText: { fontSize: fontSizes.sm, color: colors.dark.textMuted },
  
  evidenceList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  evidenceThumbWrap: {
    position: 'relative',
  },
  evidenceThumb: { width: 80, height: 80, borderRadius: radii.md },
  evidenceRemove: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.danger[500],
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.dark.bg,
    zIndex: 10,
  },
  evidenceRemoveText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  
  evidenceActions: { flexDirection: 'row', gap: spacing.sm },
  evidenceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dark.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: spacing.md,
  },
  evidenceBtnIcon: { fontSize: 18 },
  evidenceBtnText: { fontSize: fontSizes.sm, color: colors.dark.text, fontWeight: '600' },
  
  gpsStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  gpsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.dark.textMuted,
  },
  gpsOk: { backgroundColor: colors.accent[500] },
  gpsWarn: { backgroundColor: colors.warning[500] },
  gpsText: {
    fontSize: fontSizes.xs,
    color: colors.dark.textMuted,
    fontWeight: '600',
  },

  submit: {
    backgroundColor: colors.danger[600],
    borderRadius: radii.md,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitDisabled: { opacity: 0.8 },
  submitDone: { backgroundColor: colors.accent[600] },
  submitText: { fontSize: fontSizes.base, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  rowCenter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
