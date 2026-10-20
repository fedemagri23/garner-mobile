import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ScanButton } from '@/components/scan-button';
import { Screen } from '@/components/screen';
import { SearchBox } from '@/components/search-box';
import { Text } from '@/components/text';
import { useMe } from '@/features/account/use-me';
import { LocationChip } from '@/features/location/location-chip';
import { PriceDropList } from '@/features/prices/price-drop-list';
import { errorMessage } from '@/lib/error-message';
import { useSession } from '@/session/session-provider';
import { colors, radii, space } from '@/theme/tokens';

export default function HomeScreen() {
  const me = useMe();
  const { signOut } = useSession();

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.greeting}>
          {me.isPending ? (
            <ActivityIndicator color={colors.accent} style={styles.spinner} />
          ) : me.isError ? (
            <Text tone="danger">{errorMessage(me.error)}</Text>
          ) : (
            <Text tone="muted">Hola, {me.data.displayName}</Text>
          )}
          <Text variant="title" accessibilityRole="header">
            ¿Qué compramos hoy?
          </Text>
        </View>
        <LocationChip />
      </View>

      <View style={styles.searchRow}>
        <View style={styles.search}>
          <SearchBox onPress={() => router.navigate('/search')} />
        </View>
        <ScanButton />
      </View>

      <View style={styles.card}>
        <Text variant="label" tone="accent">
          Fase 3
        </Text>
        <Text tone="muted">
          Acá va tu lista con el ahorro estimado y el plan de dónde comprar.
        </Text>
      </View>

      <PriceDropList />

      <Button label="Cerrar sesión" variant="secondary" onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: space.md,
    paddingTop: space.xl,
  },
  greeting: { flex: 1, gap: space.xs },
  searchRow: { flexDirection: 'row', gap: space.sm + 2 },
  search: { flex: 1 },
  spinner: { alignSelf: 'flex-start' },
  card: {
    padding: space.xl,
    gap: space.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
});
