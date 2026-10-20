import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/chip';
import { Text } from '@/components/text';
import { space } from '@/theme/tokens';

export const LIST_CURRENCIES = [
  { code: 'ARS', label: 'Pesos' },
  { code: 'EUR', label: 'Euros' },
];

/**
 * A new list's currency, fixed once the list exists. It starts on the
 * currency of the stores near the shopper; when that is unknown nothing is
 * selected, and the list cannot be created until the shopper picks one.
 */
export function CurrencyPicker({
  value,
  local,
  looking,
  onChange,
}: {
  value: string | null;
  local: string | null;
  looking: boolean;
  onChange: (code: string) => void;
}) {
  const note = looking
    ? 'Buscando la moneda de los súper cerca tuyo…'
    : value === null
      ? 'Elegí la moneda de los súper donde vas a comprar.'
      : value === local
        ? 'La de los súper cerca tuyo.'
        : '';

  return (
    <View style={styles.box}>
      <Text variant="label">Moneda</Text>
      <View style={styles.chips}>
        {LIST_CURRENCIES.map((option) => (
          <Chip
            key={option.code}
            label={`${option.label} (${option.code})`}
            selected={value === option.code}
            onPress={() => onChange(option.code)}
          />
        ))}
      </View>
      <Text variant="caption" tone="muted">
        {note ? `${note} ` : ''}No se puede cambiar después.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: space.sm },
  chips: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
});
