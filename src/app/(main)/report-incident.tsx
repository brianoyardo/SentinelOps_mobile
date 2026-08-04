import { useState, useCallback } from 'react';
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
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<IncidentType>('security');
  const [severity, setSeverity] = useState<IncidentSeverity>('medium');
  const [evidence, setEvidence] = useState<Array<{ uri: string; name: string; mimeType: string }>>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

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

  const handleSubmit = async () => {
    if (!title.trim()) {
      setErrorMessage('Ingrese un título para el incidente');
      setShowError(true);
      return;
    }

    setSubmitting(true);
    try {
      await createIncident({
        title: title.trim(),
        description: description.trim(),
        type,
        severity,
        reportedBy: user?.uid ?? '',
        guardName: user?.fullName ?? '',
        guardCode: user?.guardId ?? '',
        location: null,
        evidenceUris: evidence,
      });
      setShowSuccess(true);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al reportar');
      setShowError(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <Text style={styles.title}>Reportar Incidente</Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Título</Text>
            <TextInput
              style={styles.input}
              placeholder="Título del incidente"
              placeholderTextColor={colors.dark.textMuted}
              value={title}
              onChangeText={setTitle}
              editable={!submitting}
            />
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
              editable={!submitting}
            />
          </View>

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
                  disabled={submitting}
                >
                  <Text style={[styles.chipText, severity === s.value && { color: s.color, fontWeight: '700' }]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Evidencia Fotográfica</Text>
            {evidence.length > 0 && (
              <View style={styles.evidenceList}>
                {evidence.map((ev, i) => (
                  <Image key={i} source={{ uri: ev.uri }} style={styles.evidenceThumb} />
                ))}
              </View>
            )}
            <View style={styles.evidenceActions}>
              <TouchableOpacity style={styles.evidenceBtn} onPress={handleCameraCapture} activeOpacity={0.7}>
                <Text style={styles.evidenceBtnIcon}>📸</Text>
                <Text style={styles.evidenceBtnText}>Cámara</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.evidenceBtn} onPress={pickImage} activeOpacity={0.7}>
                <Text style={styles.evidenceBtnIcon}>🖼</Text>
                <Text style={styles.evidenceBtnText}>Galería</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submit, submitting && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>ENVIAR REPORTE</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={showSuccess}
        title="Incidente Reportado"
        message="El incidente ha sido registrado exitosamente en el sistema."
        confirmText="OK"
        onConfirm={() => { setShowSuccess(false); router.back(); }}
        onCancel={() => { setShowSuccess(false); router.back(); }}
      />

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
  title: { fontSize: fontSizes['2xl'], fontWeight: '700', color: colors.dark.text },
  field: { gap: spacing.sm },
  fieldLabel: { fontSize: fontSizes.xs, fontWeight: '600', color: colors.dark.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
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
  evidenceList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  evidenceThumb: { width: 64, height: 64, borderRadius: radii.md },
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
  submit: {
    backgroundColor: colors.danger[600],
    borderRadius: radii.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { fontSize: fontSizes.base, fontWeight: '700', color: '#fff', letterSpacing: 2 },
});
