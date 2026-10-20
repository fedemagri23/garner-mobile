import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ScanButton } from '@/components/scan-button';
import { Screen } from '@/components/screen';
import { SearchBox } from '@/components/search-box';
import { Text } from '@/components/text';
import { useMe } from '@/features/account/use-me';
import { ContributionsLink } from '@/features/contributions/contributions-link';
import { LocationChip } from '@/features/location/location-chip';
import { SavingsCard } from '@/features/plan/savings-card';
import { PriceDropList } from '@/features/prices/price-drop-list';
import { t } from '@/i18n';
import { errorMessage } from '@/lib/error-message';
import { useSession } from '@/session/session-provider';
import { colors, space } from '@/theme/tokens';

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
            <Text tone="muted">{t('shell.home.greeting', { name: me.data.displayName })}</Text>
          )}
          <Text variant="title" accessibilityRole="header">
            {t('shell.home.question')}
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

      <SavingsCard />

      <PriceDropList />

      <ContributionsLink />

      <Button label={t('shell.home.signOut')} variant="secondary" onPress={signOut} />
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
});
