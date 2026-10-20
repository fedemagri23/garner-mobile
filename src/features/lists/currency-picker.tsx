import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/chip';
import { Text } from '@/components/text';
import { t } from '@/i18n';
import { space } from '@/theme/tokens';

export const LIST_CURRENCIES = [{ code: 'ARS' }, { code: 'EUR' }] as const;

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
    ? t('lists.currency.looking')
    : value === null
      ? t('lists.currency.choose')
      : value === local
        ? t('lists.currency.local')
        : '';

  return (
    <View style={styles.box}>
      <Text variant="label">{t('lists.currency.label')}</Text>
      <View style={styles.chips}>
        {LIST_CURRENCIES.map((option) => (
          <Chip
            key={option.code}
            label={`${t(`lists.currency.${option.code}`)} (${option.code})`}
            selected={value === option.code}
            onPress={() => onChange(option.code)}
          />
        ))}
      </View>
      <Text variant="caption" tone="muted">
        {note ? `${note} ` : ''}{t('lists.currency.permanent')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: space.sm },
  chips: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
});
