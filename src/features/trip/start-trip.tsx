import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { StateMessage } from '@/components/state-message';
import { Text } from '@/components/text';
import { useLists } from '@/features/lists/use-lists';
import { useOutbox } from '@/features/outbox/outbox-provider';
import { SyncBanner } from '@/features/outbox/sync-banner';
import { errorMessage } from '@/lib/error-message';
import { productCount } from '@/lib/format';
import { colors, radii, space } from '@/theme/tokens';

import { useStartTrip } from './use-trip';

/** Compra with no trip under way: start one from a list. */
export function StartTrip() {
  const lists = useLists();
  const start = useStartTrip();
  // A new trip waits for the last one to reach the server: until then the
  // server still has that one open, and would hand it back.
  const { pending } = useOutbox();
  const withItems = (lists.data ?? []).filter((list) => list.totals.itemCount > 0);

  return (
    <Screen>
      <SyncBanner />
      <View style={styles.header}>
        <Text variant="title" accessibilityRole="header">
          Compra
        </Text>
        <Text tone="muted">
          Marcá lo que vas poniendo en el carrito y anotá lo que pagás. Para seguir un plan de varios
          súper, empezá desde “¿Dónde conviene comprar?” en tu lista.
        </Text>
      </View>
      {lists.isPending ? (
        <StateMessage loading />
      ) : lists.isError ? (
        <StateMessage tone="danger" message={errorMessage(lists.error)} />
      ) : withItems.length === 0 ? (
        <StateMessage message="Armá una lista con productos para empezar una compra." />
      ) : (
        withItems.map((list) => (
          <View key={list.id} style={styles.row}>
            <View style={styles.rowText}>
              <Text variant="bodyStrong">{list.name}</Text>
              <Text variant="caption" tone="muted">
                {productCount(list.totals.itemCount)}
              </Text>
            </View>
            <Button
              label="Empezar"
              accessibilityLabel={`Empezar la compra de ${list.name}`}
              loading={start.isPending && start.variables?.listId === list.id}
              disabled={start.isPending || pending > 0}
              onPress={() => start.mutate({ listId: list.id })}
              style={styles.start}
            />
          </View>
        ))
      )}
      {pending > 0 ? (
        <Text variant="caption" tone="muted">
          Estamos enviando tu compra anterior; en cuanto llegue podés empezar otra.
        </Text>
      ) : null}
      {start.isError ? <Text tone="danger">{errorMessage(start.error)}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: space.sm, paddingTop: space.xl },
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
  rowText: { flex: 1, gap: 2 },
  start: { minHeight: 44, paddingHorizontal: space.lg },
});
