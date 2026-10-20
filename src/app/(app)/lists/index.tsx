import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { StateMessage } from '@/components/state-message';
import { Text } from '@/components/text';
import { NewListSheet } from '@/features/lists/new-list-sheet';
import { useLists, type ListSummary } from '@/features/lists/use-lists';
import { errorMessage } from '@/lib/error-message';
import { formatDay, formatPrice, productCount } from '@/lib/format';
import { colors, MIN_TOUCH, radii, space } from '@/theme/tokens';

export default function ListsScreen() {
  const lists = useLists();
  const [creating, setCreating] = useState(false);

  return (
    <Screen scroll={false}>
      <FlatList
        data={lists.data ?? []}
        keyExtractor={(list) => list.id}
        renderItem={({ item }) => <ListRow list={item} />}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="title" accessibilityRole="header">
              Tus listas
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Nueva lista"
              onPress={() => setCreating(true)}
              style={({ pressed }) => [styles.newButton, pressed && styles.pressed]}>
              <Ionicons name="add" size={20} color={colors.onAccent} />
              <Text variant="label" tone="onAccent">
                Nueva
              </Text>
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          lists.isPending ? (
            <StateMessage loading />
          ) : lists.isError ? (
            <StateMessage tone="danger" message={errorMessage(lists.error)} />
          ) : (
            <View style={styles.empty}>
              <Text tone="muted">Todavía no tenés listas. Armá una y agregale productos.</Text>
              <Button label="Crear mi primera lista" onPress={() => setCreating(true)} />
            </View>
          )
        }
      />
      <NewListSheet visible={creating} onClose={() => setCreating(false)} />
    </Screen>
  );
}

function ListRow({ list }: { list: ListSummary }) {
  const { itemCount, expectedTotalCents, unpricedItemCount } = list.totals;
  const priced = itemCount > unpricedItemCount;
  const meta = [
    productCount(itemCount),
    priced ? `${formatPrice(expectedTotalCents, list.currency)} estimado` : null,
    `editada ${formatDay(list.updatedAt)}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${list.name}, ${meta}`}
      onPress={() => router.push(`/lists/${list.id}`)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.rowText}>
        <Text variant="bodyStrong">{list.name}</Text>
        <Text variant="caption" tone="muted">
          {meta}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.xl, gap: space.md - 2 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: space.xl,
    paddingBottom: space.sm,
  },
  newButton: {
    height: MIN_TOUCH,
    paddingHorizontal: space.lg,
    borderRadius: MIN_TOUCH / 2,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
  },
  pressed: { opacity: 0.85 },
  rowText: { flex: 1, gap: 3 },
  empty: { gap: space.md, paddingVertical: space.xl },
});
