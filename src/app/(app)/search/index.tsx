import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { ProductTile } from '@/components/product-tile';
import { ScanButton } from '@/components/scan-button';
import { Screen } from '@/components/screen';
import { SearchBox } from '@/components/search-box';
import { StateMessage } from '@/components/state-message';
import { Text } from '@/components/text';
import { LabelChips, LabelTags, type Label } from '@/features/catalog/labels';
import { useProductSearch, type Product } from '@/features/catalog/use-catalog';
import { OriginBadge } from '@/features/community/badges';
import { departmentsOf, searchCategories, type Category } from '@/features/community/category-tree';
import { useAllCategories } from '@/features/community/use-community';
import { t } from '@/i18n';
import { categoryName } from '@/lib/category-name';
import { errorMessage } from '@/lib/error-message';
import { productCount } from '@/lib/format';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { colors, MIN_TOUCH, radii, space } from '@/theme/tokens';

/**
 * Buscar: type to find products, or browse the shop's departments and
 * aisles. With nothing typed and nothing chosen it lists the departments;
 * a department shows its aisles as chips above its products; labels (sin
 * TACC, vegano…) narrow whatever is shown.
 */
export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [labels, setLabels] = useState<Label[]>([]);
  const search = useDebouncedValue(query.trim());

  const categories = useAllCategories();
  const all = useMemo(() => categories.data ?? [], [categories.data]);
  const departments = useMemo(() => departmentsOf(all), [all]);
  const chosen = all.find((category) => category.id === categoryId) ?? null;
  const department = chosen?.parentId ? (all.find((category) => category.id === chosen.parentId) ?? null) : chosen;
  const aisles = department ? (departments.find((entry) => entry.category.id === department.id)?.aisles ?? []) : [];
  // Categories whose name or everyday words match what is typed: "limo" → Gaseosas.
  const matchingCategories = search ? searchCategories(all, search).slice(0, 3) : [];

  const atRoot = !search && !categoryId && labels.length === 0;
  const results = useProductSearch(search, categoryId, labels, !atRoot);
  const products = results.data?.pages.flatMap((page) => page.data) ?? [];
  const total = results.data?.pages[0]?.meta.totalItems;

  const open = (category: Category) => {
    setCategoryId(category.id);
    setQuery('');
  };

  const header = (
    <View style={styles.header}>
      <View style={styles.searchRow}>
        <View style={styles.search}>
          <SearchBox
            value={query}
            onChangeText={setQuery}
            focused={focused}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        </View>
        <ScanButton variant="outlined" />
      </View>
      <LabelChips value={labels} onChange={setLabels} scroll />

      {department ? (
        <View style={styles.browse}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              chosen?.parentId
                ? t('browse.search.backTo', { name: categoryName(department) })
                : t('browse.search.departments')
            }
            onPress={() => setCategoryId(chosen?.parentId ? department.id : null)}
            style={styles.crumb}>
            <Ionicons name="chevron-back" size={18} color={colors.accent} />
            <Text variant="label" tone="accent">
              {chosen?.parentId
                ? t('browse.search.backTo', { name: categoryName(department) })
                : t('browse.search.departments')}
            </Text>
          </Pressable>
          <Text variant="heading" accessibilityRole="header">
            {categoryName(chosen ?? department)}
          </Text>
          {aisles.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              <Chip
                label={t('browse.search.allOf', { name: categoryName(department) })}
                selected={categoryId === department.id}
                onPress={() => setCategoryId(department.id)}
              />
              {aisles.map((aisle) => (
                <Chip
                  key={aisle.id}
                  label={categoryName(aisle)}
                  selected={categoryId === aisle.id}
                  onPress={() => setCategoryId(aisle.id)}
                />
              ))}
            </ScrollView>
          ) : null}
        </View>
      ) : null}

      {matchingCategories.map((category) => (
        <Pressable
          key={category.id}
          accessibilityRole="button"
          accessibilityLabel={t('browse.search.seeAll', { name: categoryName(category) })}
          onPress={() => open(category)}
          style={({ pressed }) => [styles.categoryRow, pressed && styles.pressed]}>
          <Text variant="bodyStrong" style={styles.rowText}>
            {t('browse.search.seeAll', { name: categoryName(category) })}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
      ))}

      {atRoot ? (
        <Text variant="label" tone="muted">
          {t('browse.search.departments')}
        </Text>
      ) : total !== undefined ? (
        <Text variant="caption" tone="muted">
          {productCount(total)}
        </Text>
      ) : null}
    </View>
  );

  if (atRoot) {
    return (
      <Screen scroll={false}>
        <FlatList
          data={departments}
          keyExtractor={(entry) => entry.category.id}
          renderItem={({ item }) => <DepartmentRow category={item.category} onPress={() => open(item.category)} />}
          ListHeaderComponent={header}
          ListEmptyComponent={
            categories.isPending ? (
              <StateMessage loading />
            ) : categories.isError ? (
              <StateMessage tone="danger" message={errorMessage(categories.error)} />
            ) : null
          }
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.list}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <FlatList
        data={products}
        keyExtractor={(product) => product.id}
        renderItem={({ item }) => <ProductRow product={item} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          results.isPending ? (
            <StateMessage loading />
          ) : results.isError ? (
            <StateMessage tone="danger" message={errorMessage(results.error)} />
          ) : (
            <View>
              <StateMessage
                message={search ? t('browse.search.noResults', { search }) : t('browse.search.emptyCategory')}
              />
              {search ? (
                <Button
                  label={t('community.entry.notFound')}
                  variant="secondary"
                  onPress={() => router.push({ pathname: '/add-product', params: { name: search } })}
                />
              ) : null}
            </View>
          )
        }
        ListFooterComponent={
          results.isFetchingNextPage ? (
            <ActivityIndicator color={colors.accent} />
          ) : search && products.length > 0 && !results.hasNextPage ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/add-product', params: { name: search } })}
              style={styles.notListed}>
              <Ionicons name="add-circle-outline" size={18} color={colors.accent} />
              <Text variant="label" tone="accent">
                {t('community.entry.notListed')}
              </Text>
            </Pressable>
          ) : undefined
        }
        onEndReached={() => {
          if (results.hasNextPage && !results.isFetchingNextPage) {
            results.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.list}
      />
    </Screen>
  );
}

function DepartmentRow({ category, onPress }: { category: Category; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={categoryName(category)}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Text variant="bodyStrong" style={styles.rowText}>
        {categoryName(category)}
      </Text>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

function ProductRow({ product }: { product: Product }) {
  const meta = [product.brand?.name, product.packageLabel].filter(Boolean).join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[product.name, meta, product.origin === 'COMMUNITY' ? t('community.badge.unverified') : '']
        .filter(Boolean)
        .join(', ')}
      onPress={() => router.push(`/search/product/${product.id}`)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <ProductTile name={product.name} imageUrl={product.imageUrl} size={48} />
      <View style={styles.rowText}>
        <Text variant="bodyStrong" numberOfLines={2}>
          {product.name}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {meta || categoryName(product.category)}
        </Text>
        <OriginBadge origin={product.origin} />
        <LabelTags labels={product.labels} />
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { padding: space.xl, gap: space.md - 2 },
  header: { gap: space.lg, paddingTop: space.sm, paddingBottom: space.xs },
  chips: { gap: space.sm },
  searchRow: { flexDirection: 'row', gap: space.sm + 2 },
  search: { flex: 1 },
  browse: { gap: space.sm },
  crumb: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: MIN_TOUCH, alignSelf: 'flex-start' },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: MIN_TOUCH + 8,
    paddingHorizontal: 14,
    backgroundColor: colors.accentSoft,
    borderRadius: radii.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
  },
  pressed: { backgroundColor: colors.surfaceMuted },
  rowText: { flex: 1, minWidth: 0, gap: 3 },
  notListed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    minHeight: 44,
  },
});
