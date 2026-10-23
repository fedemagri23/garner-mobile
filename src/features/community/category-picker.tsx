import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { t } from '@/i18n';
import { categoryName } from '@/lib/category-name';
import { colors, fonts, MIN_TOUCH, radii, space } from '@/theme/tokens';

import { categoryPath, departmentsOf, searchCategories, type Category } from './category-tree';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

/** A department's icon from the taxonomy; one the app does not ship falls back to a plain shape. */
export function categoryIcon(category: Category | undefined): IconName {
  const name = category?.icon;
  return name && name in MaterialCommunityIcons.glyphMap ? (name as IconName) : 'shape-outline';
}

/**
 * The category of a product: shows the one chosen ("Lácteos y huevos ›
 * Yogures") and opens a sheet to choose — by typing (names and search words
 * in every language) or by department, then aisle. Built for the full
 * taxonomy: twenty departments, over a hundred aisles.
 */
export function CategoryField({
  categories,
  value,
  onChange,
  error,
}: {
  categories: Category[];
  value: string | null;
  onChange: (id: string) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const chosen = categories.find((category) => category.id === value);
  const department = chosen && (chosen.parentId ? categories.find((c) => c.id === chosen.parentId) : chosen);
  const label = chosen ? categoryPath(chosen, categories) : t('community.addProduct.categoryChoose');

  return (
    <View style={styles.field}>
      <Text variant="label">{t('community.addProduct.category')}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={chosen ? t('community.addProduct.categoryLabel', { name: label }) : label}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.box, error ? styles.boxError : null, pressed && styles.pressed]}>
        <MaterialCommunityIcons name={categoryIcon(department)} size={22} color={chosen ? colors.accent : colors.muted} />
        <Text style={styles.boxText} tone={chosen ? 'ink' : 'muted'} numberOfLines={2}>
          {label}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={22} color={colors.muted} />
      </Pressable>
      {error ? (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      ) : null}
      <Sheet title={t('community.addProduct.category')} visible={open} onClose={() => setOpen(false)}>
        {open ? (
          <PickerBody
            categories={categories}
            value={value}
            onPick={(id) => {
              onChange(id);
              setOpen(false);
            }}
          />
        ) : null}
      </Sheet>
    </View>
  );
}

function PickerBody({
  categories,
  value,
  onPick,
}: {
  categories: Category[];
  value: string | null;
  onPick: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const departments = useMemo(() => departmentsOf(categories), [categories]);
  const chosenParent = categories.find((category) => category.id === value)?.parentId ?? value;
  const [expanded, setExpanded] = useState<string | null>(chosenParent ?? null);
  const found = useMemo(() => searchCategories(categories, query), [categories, query]);
  const searching = query.trim().length >= 2;

  return (
    <View style={styles.body}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        accessibilityLabel={t('community.addProduct.categorySearch')}
        placeholder={t('community.addProduct.categorySearch')}
        placeholderTextColor={colors.muted}
        autoCorrect={false}
        style={styles.search}
      />
      <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
        {searching ? (
          found.length === 0 ? (
            <Text tone="muted" style={styles.empty}>
              {t('community.addProduct.categoryNoMatch')}
            </Text>
          ) : (
            found.map((category) => {
              const parent = categories.find((candidate) => candidate.id === category.parentId);
              return (
                <Row
                  key={category.id}
                  icon={categoryIcon(parent ?? category)}
                  label={categoryName(category)}
                  note={parent ? categoryName(parent) : undefined}
                  selected={category.id === value}
                  onPress={() => onPick(category.id)}
                />
              );
            })
          )
        ) : (
          departments.map(({ category, aisles }) => {
            const open = expanded === category.id;
            return (
              <View key={category.id}>
                <Row
                  icon={categoryIcon(category)}
                  label={categoryName(category)}
                  selected={category.id === value}
                  trailing={aisles.length > 0 ? (open ? 'chevron-down' : 'chevron-right') : undefined}
                  expanded={aisles.length > 0 ? open : undefined}
                  onPress={() => (aisles.length > 0 ? setExpanded(open ? null : category.id) : onPick(category.id))}
                />
                {open ? (
                  <View style={styles.aisles}>
                    {aisles.map((aisle) => (
                      <Row
                        key={aisle.id}
                        label={categoryName(aisle)}
                        selected={aisle.id === value}
                        onPress={() => onPick(aisle.id)}
                      />
                    ))}
                    <Row
                      label={t('community.addProduct.categoryAll', { name: categoryName(category) })}
                      selected={category.id === value}
                      onPress={() => onPick(category.id)}
                    />
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function Row({
  icon,
  label,
  note,
  selected,
  trailing,
  expanded,
  onPress,
}: {
  icon?: IconName;
  label: string;
  note?: string;
  selected: boolean;
  trailing?: IconName;
  expanded?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={note ? `${label}, ${note}` : label}
      accessibilityState={{ selected, expanded }}
      onPress={onPress}
      style={({ pressed }) => [styles.row, selected && styles.rowSelected, pressed && styles.pressed]}>
      {icon ? <MaterialCommunityIcons name={icon} size={22} color={colors.inkSoft} /> : null}
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {note ? (
          <Text variant="caption" tone="muted">
            {note}
          </Text>
        ) : null}
      </View>
      {selected ? <MaterialCommunityIcons name="check" size={20} color={colors.accent} /> : null}
      {trailing ? <MaterialCommunityIcons name={trailing} size={20} color={colors.muted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  box: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  boxError: { borderColor: colors.danger },
  boxText: { flex: 1 },
  pressed: { backgroundColor: colors.surfaceMuted },
  body: { gap: space.sm, flexShrink: 1 },
  search: {
    height: 48,
    paddingHorizontal: space.lg,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: colors.ink,
  },
  list: { flexGrow: 0 },
  empty: { padding: space.lg },
  row: {
    minHeight: MIN_TOUCH + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
    borderRadius: radii.md,
  },
  rowSelected: { backgroundColor: colors.accentSoft },
  rowText: { flex: 1, paddingVertical: space.xs },
  rowLabel: { fontFamily: fonts.bodyMedium, fontSize: 16 },
  aisles: { paddingLeft: space.xxl },
});
