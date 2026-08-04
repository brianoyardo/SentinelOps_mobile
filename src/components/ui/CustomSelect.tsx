import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Pressable,
} from 'react-native';
import { colors, spacing, radii, fontSizes } from '@/constants/colors';

interface SelectOption {
  label: string;
  value: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  direction?: 'up' | 'down';
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Seleccionar...',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<View>(null);

  const selected = options.find((o) => o.value === value);

  return (
    <View ref={containerRef} style={styles.container}>
      <TouchableOpacity
        style={[styles.trigger, isOpen && styles.triggerOpen]}
        onPress={() => setIsOpen(!isOpen)}
        activeOpacity={0.7}
      >
        <Text style={[styles.value, !selected && styles.placeholder]}>
          {selected ? selected.label : placeholder}
        </Text>
        <Text style={[styles.arrow, isOpen && styles.arrowOpen]}>▼</Text>
      </TouchableOpacity>

      {isOpen && (
        <Pressable style={styles.overlay} onPress={() => setIsOpen(false)}>
          <View style={styles.dropdown}>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.option,
                  opt.value === value && styles.optionSelected,
                ]}
                onPress={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.optionText,
                    opt.value === value && styles.optionTextSelected,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 100,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.surface,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: radii.md,
    padding: spacing.lg,
  },
  triggerOpen: {
    borderColor: colors.primary[500],
  },
  value: {
    flex: 1,
    fontSize: fontSizes.base,
    color: colors.dark.text,
  },
  placeholder: {
    color: colors.dark.textMuted,
  },
  arrow: {
    fontSize: 10,
    color: colors.dark.textMuted,
    marginLeft: spacing.sm,
  },
  arrowOpen: {
    transform: [{ rotate: '180deg' }],
  },
  overlay: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: spacing.xs,
    zIndex: 200,
    backgroundColor: colors.dark.surface,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: radii.md,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  dropdown: {
    paddingVertical: spacing.xs,
  },
  option: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  optionSelected: {
    backgroundColor: colors.primary[500] + '15',
  },
  optionText: {
    fontSize: fontSizes.base,
    color: colors.dark.text,
  },
  optionTextSelected: {
    color: colors.primary[400],
    fontWeight: '600',
  },
});
