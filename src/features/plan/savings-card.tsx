import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { useLists } from '@/features/lists/use-lists';
import { t } from '@/i18n';
import { formatDay, formatPrice, productCount } from '@/lib/format';
import { colors, fonts, MIN_TOUCH, radii, space } from '@/theme/tokens';

import { planFor, useLatestPlan } from './use-plan';
import { extraKm, joinNames } from './wording';

/**
 * Inicio's headline: what the shopper's current list saves, from its latest
 * plan. The current list is the most recently changed one with something on
 * it.
 */
export function SavingsCard() {
  const lists = useLists();
  const list = lists.data?.find((entry) => entry.totals.itemCount > 0);
  const latest = useLatestPlan(list?.id);

  if (lists.isPending || (list && latest.isPending)) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={colors.onAccent} />
      </View>
    );
  }

  if (!list) {
    return (
      <Card
        overline={t('plan.card.listsOverline')}
        headline={t('plan.card.makeList')}
        body={t('plan.card.makeListBody')}
        action={t('plan.card.goToLists')}
        onPress={() => router.navigate('/lists')}
      />
    );
  }

  const overline = t('plan.card.overline', { list: list.name, count: productCount(list.totals.itemCount) });
  const optimization = latest.data;
  const result = optimization?.result;
  const plan = result ? planFor(result, result.recommended) : null;
  const toPlan = () => router.push(`/lists/${list.id}/plan`);

  if (!plan || !optimization) {
    return (
      <Card
        overline={overline}
        headline={t('plan.card.where')}
        body={t('plan.card.whereBody')}
        action={t('plan.card.calculate')}
        onPress={toPlan}
      />
    );
  }

  const currency = result?.currency ?? list.currency;
  const chains = joinNames([...new Set(plan.stores.map((stop) => stop.supermarketName))]);
  const when = optimization.completedAt ? t('plan.card.calculated', { when: formatDay(optimization.completedAt) }) : '';
  const body =
    plan.stores.length > 1
      ? when +
        (plan.additionalDistanceKm >= 0.05
          ? t('plan.card.split', { chains, km: extraKm(plan.additionalDistanceKm).slice(1) })
          : t('plan.card.splitNoExtra', { chains }))
      : when + t('plan.card.all', { chains });

  return (
    <Card
      overline={overline}
      headline={formatPrice(plan.savingsCents, currency)}
      headlineNote={t('plan.card.savingsNote')}
      body={body}
      action={t('plan.card.viewPlan')}
      onPress={toPlan}
    />
  );
}

function Card({
  overline,
  headline,
  headlineNote,
  body,
  action,
  onPress,
}: {
  overline: string;
  headline: string;
  headlineNote?: string;
  body: string;
  action: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.overline} tone="onAccent" numberOfLines={1}>
        {overline}
      </Text>
      <View style={styles.headlineRow}>
        <Text style={styles.headline} tone="onAccent">
          {headline}
        </Text>
        {headlineNote ? (
          <Text tone="onAccent" style={styles.note}>
            {headlineNote}
          </Text>
        ) : null}
      </View>
      <Text tone="onAccent" style={styles.body}>
        {body}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={action}
        onPress={onPress}
        style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
        <Text style={styles.actionText}>{action}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.ink} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.accent, borderRadius: radii.xl, padding: space.xl, gap: 14, minHeight: 120, justifyContent: 'center' },
  overline: { fontFamily: fonts.bodySemi, fontSize: 13, letterSpacing: 0.4, textTransform: 'uppercase', opacity: 0.85 },
  headlineRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm, flexWrap: 'wrap' },
  headline: { fontFamily: fonts.display, fontSize: 36, lineHeight: 40, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  note: { fontSize: 15, opacity: 0.9 },
  body: { fontSize: 14, lineHeight: 20, opacity: 0.92 },
  action: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: MIN_TOUCH,
    paddingHorizontal: 18,
    borderRadius: MIN_TOUCH / 2,
    backgroundColor: colors.surface,
  },
  actionPressed: { backgroundColor: colors.surfaceMuted },
  actionText: { fontFamily: fonts.bodyBold, fontSize: 15 },
});
