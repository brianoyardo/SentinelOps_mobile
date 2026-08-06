import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView } from 'react-native';
import { Modal } from '@/components/ui/Modal';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { PATROL_TYPES, SHIFT_TYPES } from '@/config/constants';
import { colors, spacing, radii, fontSizes } from '@/constants/colors';

interface PreOpModalProps {
  visible: boolean;
  rondaName?: string | null;
  notes?: string | null;
  onCancel: () => void;
  onConfirm: (data: { patrolType: string; vehicleId: string | null; shift: string }) => void;
}

export function PreOpModal({ visible, rondaName, notes, onCancel, onConfirm }: PreOpModalProps) {
  const [patrolType, setPatrolType] = useState<string>(PATROL_TYPES.A_PIE);
  const [vehicleId, setVehicleId] = useState('');
  const [shift, setShift] = useState<string>(SHIFT_TYPES.DIURNO);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setPatrolType(PATROL_TYPES.A_PIE);
      setVehicleId('');
      setShift(SHIFT_TYPES.DIURNO);
      setError(null);
      setIsSubmitting(false);
    }
  }, [visible]);

  const isMotorized = patrolType === PATROL_TYPES.MOTORIZADO;

  const handleConfirm = useCallback(() => {
    if (isSubmitting) return;

    if (isMotorized && !vehicleId.trim()) {
      setError('Ingrese el identificador del vehículo');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    onConfirm({
      patrolType,
      vehicleId: isMotorized ? vehicleId.trim() : null,
      shift,
    });
  }, [isSubmitting, isMotorized, vehicleId, patrolType, shift, onConfirm]);

  const patrolOptions = [
    { value: PATROL_TYPES.A_PIE, label: 'A Pie' },
    { value: PATROL_TYPES.MOTORIZADO, label: 'Motorizado' },
  ];

  const shiftOptions = [
    { value: SHIFT_TYPES.DIURNO, label: 'Diurno' },
    { value: SHIFT_TYPES.NOCTURNO, label: 'Nocturno' },
    { value: SHIFT_TYPES.PRIMER_TURNO, label: 'Primer Turno' },
    { value: SHIFT_TYPES.SEGUNDO_TURNO, label: 'Segundo Turno' },
  ];

  return (
    <Modal visible={visible} onClose={onCancel} containerStyle={styles.modalContainer}>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Datos Operativos</Text>
          <Text style={styles.subtitle}>{rondaName || 'Ronda de Patrullaje'}</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Tipo de Patrullaje *</Text>
            <CustomSelect
              value={patrolType}
              onChange={(val) => {
                setPatrolType(val);
                setError(null);
              }}
              options={patrolOptions}
            />
          </View>

          {isMotorized && (
            <View style={[styles.field, styles.fieldHighlight]}>
              <Text style={styles.label}>Identificador del Vehículo *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: VEH-001, Moto-12"
                placeholderTextColor={colors.dark.textMuted}
                value={vehicleId}
                onChangeText={(val) => {
                  setVehicleId(val);
                  setError(null);
                }}
                autoFocus
              />
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Turno *</Text>
            <CustomSelect value={shift} onChange={setShift} options={shiftOptions} />
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Indicaciones de la ronda</Text>
            <View style={[styles.notesBox, !notes && styles.notesBoxEmpty]}>
              <Text style={[styles.notesText, !notes && styles.notesTextEmpty]}>
                {notes ? notes : 'Sin indicaciones adicionales'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, styles.btnCancel]}
            onPress={onCancel}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            <Text style={styles.btnCancelText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnConfirm, isSubmitting && styles.btnSubmitting]}
            onPress={handleConfirm}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            <Text style={styles.btnConfirmText}>
              {isSubmitting ? 'Iniciando...' : 'Continuar'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    maxHeight: '90%',
  },
  content: {
    flexGrow: 1,
    flexShrink: 1,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.dark.text,
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.dark.textMuted,
    marginTop: spacing.xs,
  },
  form: {
    gap: spacing.lg,
  },
  field: {
    gap: spacing.sm,
  },
  fieldHighlight: {
    borderLeftWidth: 3,
    borderLeftColor: colors.accent[500],
    paddingLeft: spacing.md,
    borderRadius: radii.sm,
  },
  label: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.dark.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.dark.surface,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: radii.md,
    padding: spacing.lg,
    fontSize: fontSizes.base,
    color: colors.dark.text,
  },
  errorBox: {
    backgroundColor: colors.danger[900] + '30',
    borderWidth: 1,
    borderColor: colors.danger[500] + '60',
    borderRadius: radii.md,
    padding: spacing.md,
  },
  errorText: {
    color: colors.danger[300],
    fontSize: fontSizes.sm,
  },
  notesBox: {
    backgroundColor: colors.dark.surface,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: radii.md,
    padding: spacing.lg,
    minHeight: 64,
  },
  notesBoxEmpty: {
    borderStyle: 'dashed',
    borderColor: colors.dark.border,
  },
  notesText: {
    fontSize: fontSizes.base,
    color: colors.dark.text,
    lineHeight: 22,
  },
  notesTextEmpty: {
    color: colors.dark.textMuted,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  btn: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancel: {
    backgroundColor: colors.dark.surface,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  btnCancelText: {
    fontSize: fontSizes.base,
    fontWeight: '600',
    color: colors.dark.textMuted,
  },
  btnConfirm: {
    backgroundColor: colors.primary[600],
  },
  btnSubmitting: {
    opacity: 0.6,
  },
  btnConfirmText: {
    fontSize: fontSizes.base,
    fontWeight: '700',
    color: '#ffffff',
  },
});
