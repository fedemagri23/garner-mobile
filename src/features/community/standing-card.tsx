import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { t } from '@/i18n';
import { errorMessage } from '@/lib/error-message';
import { colors, fonts, MIN_TOUCH, radii, space } from '@/theme/tokens';

import { FlagSheet } from './flag-sheet';
import { useConfirmProduct, useViewerSay } from './use-community';

/**
 * Under a product someone in the community added: how many people stand
 * behind it, and the two things another shopper can say about it — "it
 * exists and it's right", or "this is wrong". Its creator sees neither.
 */
export function StandingCard({
  productId,
  productName,
  confirmations,
}: {
  productId: string;
  productName: string;
  confirmations: number;
}) {
  const say = useViewerSay('product', productId);
  const confirm = useConfirmProduct(productId);
  const [flagging, setFlagging] = useState(false);

  const mine = say.data?.addedByYou ?? false;
  const confirmed = say.data?.confirmed ?? false;
  const flagged = say.data?.flagged ?? false;
  // Shown at once; the server's count follows.
  const count = confirm.data?.confirmations ?? confirmations;

  return (
    <View style={styles.card}>
      <Text variant="bodyStrong">{mine ? t('community.standing.byYou') : t('community.standing.byCommunity')}</Text>
      <Text variant="caption" tone="muted">
        {count > 0 ? t('community.standing.confirmations', { count }) : t('community.standing.noConfirmations')}
      </Text>
      {say.data && !mine ? (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: confirmed, busy: confirm.isPending }}
            accessibilityLabel={confirmed ? t('community.standing.withdraw') : t('community.standing.confirm')}
            disabled={confirm.isPending}
            onPress={() => confirm.mutate(!confirmed)}
            style={({ pressed }) => [styles.action, confirmed && styles.confirmed, pressed && styles.pressed]}>
            <Ionicons
              name={confirmed ? 'checkmark-circle' : 'checkmark-circle-outline'}
              size={18}
              color={confirmed ? colors.onAccent : colors.accent}
            />
            <Text style={styles.actionText} tone={confirmed ? 'onAccent' : 'accent'}>
              {confirmed ? t('community.standing.confirmed') : t('community.standing.confirm')}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={flagged ? t('community.standing.reported') : t('community.standing.report')}
            disabled={flagged}
            onPress={() => setFlagging(true)}
            style={({ pressed }) => [styles.action, styles.report, pressed && styles.pressed]}>
            <Ionicons name={flagged ? 'flag' : 'flag-outline'} size={17} color={colors.inkSoft} />
            <Text style={styles.actionText}>
              {flagged ? t('community.standing.reported') : t('community.standing.report')}
            </Text>
          </Pressable>
        </View>
      ) : null}
      {confirm.isError ? <Text tone="danger">{errorMessage(confirm.error)}</Text> : null}
      <FlagSheet
        target="product"
        id={productId}
        name={productName}
        visible={flagging}
        onClose={() => setFlagging(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: space.lg,
    gap: space.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  action: {
    minHeight: MIN_TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.md,
    borderRadius: MIN_TOUCH / 2,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  confirmed: { backgroundColor: colors.accent },
  report: { borderColor: colors.lineStrong },
  pressed: { opacity: 0.8 },
  actionText: { fontFamily: fonts.bodySemi, fontSize: 14 },
});
