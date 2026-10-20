import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomBar } from '@/components/bottom-bar';
import { Button } from '@/components/button';
import { StateMessage } from '@/components/state-message';
import { Text } from '@/components/text';
import { useProductSearch, type Product } from '@/features/catalog/use-catalog';
import { errorMessage } from '@/lib/error-message';
import { formatDay, formatPrice, productCount } from '@/lib/format';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { colors, fonts, MIN_TOUCH, radii, space } from '@/theme/tokens';

import { ListOptionsSheet } from './list-options-sheet';
import { useAddToList, useList, useSetQuantity, type ListDetail, type ListItem } from './use-lists';

/** One list: what is on it, how many of each, and what it should cost. */
export function ListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const list = useList(id);
  const [options, setOptions] = useState(false);

  if (!list.data) {
    return (
      <SafeAreaView edges={['top']} style={styles.root}>
        <BackButton />
        {list.isError ? (
          <StateMessage
            tone="danger"
            message={errorMessage(list.error, { 404: 'Esta lista ya no existe.' })}
          />
        ) : (
          <StateMessage loading />
        )}
      </SafeAreaView>
    );
  }

  const data = list.data;

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <FlatList
        data={data.items}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <ItemRow
            listId={data.id}
            currency={data.currency}
            item={item}
            first={index === 0}
            last={index === data.items.length - 1}
          />
        )}
        contentContainerStyle={styles.content}
        // The total below sits above the tab bar, so this list never reaches it.
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.topBar}>
              <BackButton />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Más opciones"
                onPress={() => setOptions(true)}
                style={({ pressed }) => [styles.round, pressed && styles.pressed]}>
                <Ionicons name="ellipsis-horizontal" size={20} color={colors.ink} />
              </Pressable>
            </View>
            <View style={styles.titles}>
              <Text tone="muted" variant="caption">
                {productCount(data.totals.itemCount)} · editada {formatDay(data.updatedAt)}
              </Text>
              <Text variant="title" accessibilityRole="header">
                {data.name}
              </Text>
            </View>
            <AddProduct list={data} />
          </View>
        }
        ListEmptyComponent={
          <StateMessage message="La lista está vacía. Buscá un producto arriba para agregarlo." />
        }
      />
      <Totals list={data} />
      <ListOptionsSheet list={data} visible={options} onClose={() => setOptions(false)} />
    </SafeAreaView>
  );
}

function BackButton() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Volver"
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/lists'))}
      style={({ pressed }) => [styles.round, pressed && styles.pressed]}>
      <Ionicons name="chevron-back" size={20} color={colors.ink} />
    </Pressable>
  );
}

/** "Agregar producto": search the catalog without leaving the list. */
function AddProduct({ list }: { list: ListDetail }) {
  const [query, setQuery] = useState('');
  const search = useDebouncedValue(query.trim());
  const results = useProductSearch(search, null);
  const add = useAddToList();
  const [added, setAdded] = useState<string | null>(null);

  // Hide suggestions the moment the field is cleared, not when the debounce catches up.
  const matches = query.trim() && search ? (results.data?.pages[0]?.data ?? []).slice(0, 6) : [];

  const pick = async (product: Product) => {
    setAdded(null);
    const result = await add.mutateAsync({ list, productId: product.id });
    setAdded(
      result.quantity === 1 ? `Agregado: ${product.name}.` : `Ahora hay ${result.quantity} de ${product.name}.`,
    );
    setQuery('');
  };

  return (
    <View style={styles.add}>
      <View style={styles.addField}>
        <Ionicons name="add" size={20} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            setAdded(null);
          }}
          accessibilityLabel="Agregar producto"
          placeholder="Agregar producto"
          placeholderTextColor={colors.muted}
          autoCorrect={false}
          returnKeyType="search"
          style={styles.addInput}
        />
        {add.isPending ? <ActivityIndicator color={colors.accent} /> : null}
      </View>
      {matches.length > 0 ? (
        <View style={styles.matches}>
          {matches.map((product, index) => (
            <Pressable
              key={product.id}
              accessibilityRole="button"
              accessibilityLabel={`Agregar ${product.name}`}
              disabled={add.isPending}
              onPress={() => pick(product).catch(() => undefined)}
              style={({ pressed }) => [
                styles.match,
                index < matches.length - 1 && styles.divider,
                pressed && styles.pressed,
              ]}>
              <Text style={styles.matchName} numberOfLines={1}>
                {product.name}
              </Text>
              <Ionicons name="add-circle-outline" size={22} color={colors.accent} />
            </Pressable>
          ))}
        </View>
      ) : query.trim() && search && !results.isFetching && results.data ? (
        <Text variant="caption" tone="muted">
          No encontramos “{search}” en el catálogo.
        </Text>
      ) : null}
      {added ? (
        <Text variant="caption" tone="accent" accessibilityLiveRegion="polite">
          {added}
        </Text>
      ) : null}
      {add.isError ? (
        <Text variant="caption" tone="danger">
          {errorMessage(add.error, { 422: 'La lista ya está llena.' })}
        </Text>
      ) : null}
    </View>
  );
}

function ItemRow({
  listId,
  currency,
  item,
  first,
  last,
}: {
  listId: string;
  currency: string;
  item: ListItem;
  first: boolean;
  last: boolean;
}) {
  const setQuantity = useSetQuantity(listId);
  const name = item.product.name;
  const change = (quantity: number) =>
    setQuantity.mutate({ itemId: item.id, quantity });

  return (
    <View style={[styles.item, first && styles.itemFirst, last ? styles.itemLast : styles.divider]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.quantity === 1 ? `Quitar ${name}` : `Uno menos de ${name}`}
        disabled={setQuantity.isPending}
        onPress={() => change(item.quantity - 1)}
        style={styles.step}>
        <Ionicons name={item.quantity === 1 ? 'trash-outline' : 'remove'} size={18} color={colors.ink} />
      </Pressable>
      <Text style={styles.quantity} accessibilityLabel={`${item.quantity} de ${name}`}>
        {item.quantity}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Uno más de ${name}`}
        disabled={setQuantity.isPending}
        onPress={() => change(item.quantity + 1)}
        style={styles.step}>
        <Ionicons name="add" size={18} color={colors.ink} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ver ${name}`}
        onPress={() => router.push(`/lists/product/${item.product.id}`)}
        style={styles.itemName}>
        <Text style={styles.itemNameText} numberOfLines={2}>
          {name}
        </Text>
      </Pressable>
      <Text style={styles.line} tone={item.expectedLineTotalCents === null ? 'muted' : 'ink'}>
        {item.expectedLineTotalCents === null
          ? 'sin precio'
          : formatPrice(item.expectedLineTotalCents, currency)}
      </Text>
    </View>
  );
}

function Totals({ list }: { list: ListDetail }) {
  const { expectedTotalCents, unpricedItemCount, itemCount } = list.totals;
  if (itemCount === 0) {
    return null;
  }

  return (
    <BottomBar style={styles.footer}>
      <View style={styles.totalRow}>
        <Text tone="muted">Total estimado</Text>
        <Text style={styles.total}>{formatPrice(expectedTotalCents, list.currency)}</Text>
      </View>
      <Text variant="caption" tone="muted">
        Con el precio más barato cerca tuyo de cada producto, cuando lo agregaste.
        {unpricedItemCount > 0
          ? ` ${unpricedItemCount === 1 ? '1 producto no tiene' : `${unpricedItemCount} productos no tienen`} precio todavía.`
          : ''}
      </Text>
      <Button
        label="¿Dónde conviene comprar?"
        onPress={() => router.push(`/lists/${list.id}/plan`)}
        style={styles.planButton}
      />
    </BottomBar>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  content: { padding: space.xl },
  header: { gap: space.lg, paddingBottom: space.lg },
  topBar: { flexDirection: 'row', justifyContent: 'space-between' },
  round: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: MIN_TOUCH / 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: colors.surfaceMuted },
  titles: { gap: space.xs },
  add: { gap: space.sm },
  addField: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm + 2,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
  },
  addInput: { flex: 1, height: '100%', fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.ink },
  matches: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  match: {
    minHeight: MIN_TOUCH + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
  },
  matchName: { flex: 1, fontFamily: fonts.bodyMedium },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.surfaceMuted },
  item: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.sm,
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.line,
  },
  // The rows together read as one card.
  itemFirst: { borderTopWidth: 1, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg },
  itemLast: { borderBottomWidth: 1, borderBottomLeftRadius: radii.lg, borderBottomRightRadius: radii.lg },
  step: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  quantity: {
    minWidth: 24,
    textAlign: 'center',
    fontFamily: fonts.bodyBold,
    fontVariant: ['tabular-nums'],
  },
  itemName: { flex: 1, minHeight: MIN_TOUCH, justifyContent: 'center', paddingLeft: space.xs },
  itemNameText: { fontFamily: fonts.bodyMedium, fontSize: 15 },
  line: {
    paddingRight: space.sm,
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  footer: { paddingHorizontal: space.xl, paddingVertical: space.lg, gap: space.xs },
  planButton: { marginTop: space.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  total: { fontFamily: fonts.display, fontSize: 22, fontVariant: ['tabular-nums'] },
});
