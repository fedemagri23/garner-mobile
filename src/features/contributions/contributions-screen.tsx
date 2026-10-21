import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StateMessage } from '@/components/state-message';
import { Text } from '@/components/text';
import { MyAdditionsSection } from '@/features/community/my-additions';
import { pendingReports, type ReportChange } from '@/features/outbox/changes';
import { useOutbox } from '@/features/outbox/outbox-provider';
import { SyncBanner } from '@/features/outbox/sync-banner';
import { t } from '@/i18n';
import { errorMessage } from '@/lib/error-message';
import { formatDay, formatPrice } from '@/lib/format';
import { colors, fonts, MIN_TOUCH, radii, space } from '@/theme/tokens';

import { useMyContributions, type Contribution } from './use-contributions';

/** How a contribution stands, in the words of the shopper who made it. */
const TONE: Record<Contribution['status'], 'accent' | 'signal' | 'danger'> = {
  ACCEPTED: 'accent',
  UNDER_REVIEW: 'signal',
  REJECTED: 'danger',
};

/** "Mis aportes": prices waiting to be sent, then the ones the server has. */
export function ContributionsScreen() {
  const mine = useMyContributions();
  const { queue } = useOutbox();
  const waiting = pendingReports(queue);
  const rows = mine.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <FlatList
        data={rows}
        keyExtractor={(row) => row.id}
        renderItem={({ item }) => <Row row={item} />}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        onEndReached={() => {
          if (mine.hasNextPage && !mine.isFetchingNextPage) mine.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              style={styles.round}>
              <Ionicons name="chevron-back" size={20} color={colors.ink} />
            </Pressable>
            <Text variant="title" accessibilityRole="header">
              {t('contributions.link.title')}
            </Text>
            <Text tone="muted">{t('contributions.list.intro')}</Text>
            <SyncBanner />
            <MyAdditionsSection />
            {waiting.map((report) => (
              <Waiting key={report.id} report={report} />
            ))}
          </View>
        }
        ListEmptyComponent={
          mine.isPending ? (
            <StateMessage loading />
          ) : mine.isError ? (
            <StateMessage tone="danger" message={errorMessage(mine.error)} />
          ) : waiting.length > 0 ? null : (
            <StateMessage message={t('contributions.list.empty')} />
          )
        }
      />
    </SafeAreaView>
  );
}

function Waiting({ report }: { report: ReportChange }) {
  return (
    <View
      style={[styles.row, styles.waiting]}
      accessible
      accessibilityLabel={t('contributions.list.waitingLabel', { product: report.productName, price: formatPrice(report.priceCents, report.currency), store: report.storeName })}>
      <View style={styles.rowText}>
        <Text variant="bodyStrong">{report.productName}</Text>
        <Text variant="caption" tone="muted">
          {report.storeName} · {formatDay(report.observedAt)}
        </Text>
        <Text variant="caption" tone="signal" style={styles.strong}>
          {t('contributions.list.waiting')}{report.photoUri ? t('contributions.list.withPhoto') : ''}
        </Text>
      </View>
      <Text style={styles.price}>{formatPrice(report.priceCents, report.currency)}</Text>
    </View>
  );
}

function Row({ row }: { row: Contribution }) {
  const status = {
    label: t(`contributions.list.status.${row.status}.label`),
    note: t(`contributions.list.status.${row.status}.note`),
    tone: TONE[row.status],
  };
  const origin =
    row.sourceType === 'PURCHASE_CONFIRMED'
      ? t('contributions.list.fromPurchase')
      : row.hasPhotoEvidence
        ? t('contributions.list.photo')
        : t('contributions.list.reported');

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={t('contributions.list.rowLabel', { product: row.productName, price: formatPrice(row.priceCents, row.currency), store: row.storeName, status: status.label, note: status.note })}>
      <View style={styles.rowText}>
        <Text variant="bodyStrong">{row.productName}</Text>
        <Text variant="caption" tone="muted">
          {row.storeName} · {formatDay(row.observedAt)} · {origin}
        </Text>
        <Text variant="caption" tone={status.tone} style={styles.strong}>
          {status.label}
        </Text>
        {row.status === 'ACCEPTED' ? null : (
          <Text variant="caption" tone="muted">
            {status.note}
          </Text>
        )}
      </View>
      <Text style={styles.price}>{formatPrice(row.priceCents, row.currency)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  content: { padding: space.xl, gap: space.md - 2 },
  header: { gap: space.md, paddingBottom: space.sm },
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
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    padding: space.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
  },
  waiting: { borderColor: colors.signal, backgroundColor: colors.signalSoft },
  rowText: { flex: 1, gap: 2 },
  strong: { fontFamily: fonts.bodyBold },
  price: { fontFamily: fonts.bodyBold, fontSize: 17, fontVariant: ['tabular-nums'] },
});
