import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { formatPrice, productCount } from '@/lib/format';
import { colors, fonts, radii, space } from '@/theme/tokens';

import type { Trip } from './stops';

/** After "Terminar": what was spent against what was expected, and what was shared. */
export function TripSummary({ trip, onDone }: { trip: Trip; onDone: () => void }) {
  const { actualTotalCents, expectedTotalCents, purchasedItemCount } = trip.totals;
  const purchased = trip.items.filter((item) => item.isPurchased);
  // The server turns a paid price into a report only where the line has a store.
  const shared = purchased.filter(
    (item) => item.actualUnitPriceCents !== null && (item.store ?? trip.store),
  ).length;
  const expectedForPurchased = purchased.reduce((sum, item) => sum + (item.expectedLineTotalCents ?? 0), 0);
  const difference = actualTotalCents - expectedForPurchased;

  return (
    <Screen>
      <View style={styles.hero}>
        <Ionicons name="checkmark-circle" size={48} color={colors.accent} />
        <Text variant="title" accessibilityRole="header">
          Compra terminada
        </Text>
        <Text tone="muted">{trip.listName}</Text>
      </View>
      <View style={styles.card}>
        <Line label="Gastaste" value={formatPrice(actualTotalCents, trip.currency)} strong />
        <Line label="Productos" value={`${productCount(purchasedItemCount)} de ${trip.totals.itemCount}`} />
        {expectedForPurchased > 0 ? (
          <Line
            label={difference <= 0 ? 'Menos de lo esperado' : 'Más de lo esperado'}
            value={formatPrice(Math.abs(difference), trip.currency)}
            tone={difference <= 0 ? 'accent' : 'signal'}
          />
        ) : null}
        <Line label="Esperabas para toda la lista" value={formatPrice(expectedTotalCents, trip.currency)} />
      </View>
      <Text tone="muted">
        {shared === 1
          ? 'El precio que anotaste ya cuenta para los demás: así todos sabemos dónde conviene.'
          : shared > 1
            ? `Los ${shared} precios que anotaste ya cuentan para los demás: así todos sabemos dónde conviene.`
            : 'No anotaste precios en un súper conocido, así que esta vez no se comparte ninguno.'}
      </Text>
      <Button label="Listo" onPress={onDone} />
    </Screen>
  );
}

function Line({
  label,
  value,
  strong,
  tone = 'ink',
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: 'ink' | 'accent' | 'signal';
}) {
  return (
    <View style={styles.line}>
      <Text tone="muted">{label}</Text>
      <Text tone={tone} style={strong ? styles.strong : styles.value}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.sm, paddingTop: space.xxl },
  card: {
    padding: space.lg,
    gap: space.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
  },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: space.md },
  value: { fontFamily: fonts.bodyBold, fontVariant: ['tabular-nums'] },
  strong: { fontFamily: fonts.display, fontSize: 24, fontVariant: ['tabular-nums'] },
});
