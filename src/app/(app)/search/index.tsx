import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Chip } from '@/components/chip';
import { ProductTile } from '@/components/product-tile';
import { ScanButton } from '@/components/scan-button';
import { Screen } from '@/components/screen';
import { SearchBox } from '@/components/search-box';
import { StateMessage } from '@/components/state-message';
import { Text } from '@/components/text';
import { useProductSearch, useTopCategories, type Product } from '@/features/catalog/use-catalog';
import { errorMessage } from '@/lib/error-message';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { colors, radii, space } from '@/theme/tokens';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const search = useDebouncedValue(query.trim());

  const categories = useTopCategories();
  const results = useProductSearch(search, categoryId);
  const products = results.data?.pages.flatMap((page) => page.data) ?? [];
  const total = results.data?.pages[0]?.meta.totalItems;

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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}>
        <Chip label="Todo" selected={categoryId === null} onPress={() => setCategoryId(null)} />
        {categories.data?.map((category) => (
          <Chip
            key={category.id}
            label={category.name}
            selected={categoryId === category.id}
            onPress={() => setCategoryId(category.id)}
          />
        ))}
      </ScrollView>
      {total !== undefined ? (
        <Text variant="caption" tone="muted">
          {total === 1 ? '1 producto' : `${total} productos`}
        </Text>
      ) : null}
    </View>
  );

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
            <StateMessage
              message={search ? `No encontramos productos para “${search}”.` : 'No hay productos en esta categoría.'}
            />
          )
        }
        ListFooterComponent={
          results.isFetchingNextPage ? <ActivityIndicator color={colors.accent} /> : undefined
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

function ProductRow({ product }: { product: Product }) {
  const meta = [product.brand?.name, product.packageLabel].filter(Boolean).join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={meta ? `${product.name}, ${meta}` : product.name}
      onPress={() => router.push(`/search/product/${product.id}`)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <ProductTile name={product.name} imageUrl={product.imageUrl} size={48} />
      <View style={styles.rowText}>
        <Text variant="bodyStrong" numberOfLines={2}>
          {product.name}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {meta || product.category.name}
        </Text>
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
});
