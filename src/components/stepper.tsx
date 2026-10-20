import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, fonts, MIN_TOUCH, radii, space } from '@/theme/tokens';

import { Text } from './text';

/** A labelled number with − and +, kept within bounds. */
export function Stepper({
  label,
  value,
  display,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  /** How the value reads: "2 súper", "+5 km". */
  display: string;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.row} accessible={false}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Menos: ${label}`}
        disabled={value <= min}
        onPress={() => onChange(Math.max(min, value - step))}
        style={[styles.button, value <= min && styles.disabled]}>
        <Ionicons name="remove" size={18} color={colors.ink} />
      </Pressable>
      <Text style={styles.value} accessibilityLabel={`${label}: ${display}`}>
        {display}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Más: ${label}`}
        disabled={value >= max}
        onPress={() => onChange(Math.min(max, value + step))}
        style={[styles.button, value >= max && styles.disabled]}>
        <Ionicons name="add" size={18} color={colors.ink} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  label: { flex: 1, fontFamily: fonts.bodyMedium },
  button: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
  value: { minWidth: 72, textAlign: 'center', fontFamily: fonts.bodyBold, fontVariant: ['tabular-nums'] },
});
