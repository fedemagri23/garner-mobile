import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StateMessage } from '@/components/state-message';
import { Text } from '@/components/text';
import { pendingReports, type ReportChange } from '@/features/outbox/changes';
import { useOutbox } from '@/features/outbox/outbox-provider';
import { SyncBanner } from '@/features/outbox/sync-banner';
import { errorMessage } from '@/lib/error-message';
import { formatDay, formatPrice } from '@/lib/format';
import { colors, fonts, MIN_TOUCH, radii, space } from '@/theme/tokens';

import { useMyContributions, type Contribution } from './use-contributions';

/** How a contribution stands, in the words of the shopper who made it. */
const STATUS: Record<Contribution['status'], { label: string; note: string; tone: 'accent' | 'signal' | 'danger' }> = {
  ACCEPTED: { label: 'Ya cuenta', note: 'Aparece en los precios que ven los demás.', tone: 'accent' },
  UNDER_REVIEW: {
    label: 'En revisión',
    note: 'No cambia los precios hasta que otros lo confirmen.',
    tone: 'signal',
  },
  REJECTED: { label: 'No se aceptó', note: 'Parecía muy distinto de lo habitual.', tone: 'danger' },
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
              accessibilityLabel="Volver"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              style={styles.round}>
              <Ionicons name="chevron-back" size={20} color={colors.ink} />
            </Pressable>
            <Text variant="title" accessibilityRole="header">
              Mis aportes
            </Text>
            <Text tone="muted">Los precios que informaste y los de tus compras. Cada uno ayuda a otros a pagar menos.</Text>
            <SyncBanner />
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
            <StateMessage message="Todavía no informaste ningún precio. Abrí un producto y tocá “Informar precio”." />
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
      accessibilityLabel={`${report.productName}, ${formatPrice(report.priceCents, report.currency)} en ${report.storeName}, por enviar`}>
      <View style={styles.rowText}>
        <Text variant="bodyStrong">{report.productName}</Text>
        <Text variant="caption" tone="muted">
          {report.storeName} · {formatDay(report.observedAt)}
        </Text>
        <Text variant="caption" tone="signal" style={styles.strong}>
          Por enviar{report.photoUri ? ' · con foto' : ''}
        </Text>
      </View>
      <Text style={styles.price}>{formatPrice(report.priceCents, report.currency)}</Text>
    </View>
  );
}

function Row({ row }: { row: Contribution }) {
  const status = STATUS[row.status];
  const origin =
    row.sourceType === 'PURCHASE_CONFIRMED' ? 'De tu compra' : row.hasPhotoEvidence ? 'Con foto' : 'Informado por vos';

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${row.productName}, ${formatPrice(row.priceCents, row.currency)} en ${row.storeName}. ${status.label}. ${status.note}`}>
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
