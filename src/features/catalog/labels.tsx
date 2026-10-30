import { ScrollView, StyleSheet, View } from 'react-native';

import type { components } from '@/api/types';
import { Chip } from '@/components/chip';
import { Text } from '@/components/text';
import { t } from '@/i18n';
import { colors, fonts, radii, space } from '@/theme/tokens';

export type Label = components['schemas']['ProductResponse']['labels'][number];

/** The backend's labels, in its order (product-label.ts). */
export const LABELS: Label[] = [
  'gluten-free',
  'vegan',
  'vegetarian',
  'organic',
  'lactose-free',
  'sugar-free',
  'kosher',
  'halal',
];

export const labelName = (label: Label) => t(`browse.labels.${label}`);

/** Any number of labels to toggle: for a product's features, or to filter search. */
export function LabelChips({
  value,
  onChange,
  scroll = false,
}: {
  value: Label[];
  onChange: (labels: Label[]) => void;
  /** One scrolling row (a filter), instead of wrapping (a form). */
  scroll?: boolean;
}) {
  const toggle = (label: Label) =>
    onChange(value.includes(label) ? value.filter((l) => l !== label) : LABELS.filter((l) => l === label || value.includes(l)));
  const chips = LABELS.map((label) => (
    <Chip key={label} label={labelName(label)} selected={value.includes(label)} onPress={() => toggle(label)} />
  ));

  return scroll ? (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {chips}
    </ScrollView>
  ) : (
    <View style={styles.wrap}>{chips}</View>
  );
}

/** What a product is, shown under its name: "Sin TACC", "Vegano". */
export function LabelTags({ labels }: { labels: Label[] }) {
  if (labels.length === 0) return null;
  return (
    <View style={styles.wrap} accessible accessibilityLabel={labels.map(labelName).join(', ')}>
      {labels.map((label) => (
        <View key={label} style={styles.tag}>
          <Text style={styles.tagText} tone="accent">
            {labelName(label)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: space.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.pill, backgroundColor: colors.accentSoft },
  tagText: { fontFamily: fonts.bodySemi, fontSize: 12, lineHeight: 16 },
});
