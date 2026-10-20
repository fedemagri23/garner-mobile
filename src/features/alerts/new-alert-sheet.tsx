import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { useShopperLocation } from '@/features/location/location-provider';
import { t } from '@/i18n';
import { errorMessage } from '@/lib/error-message';
import { formatPrice } from '@/lib/format';
import { parsePrice, priceInput } from '@/lib/parse-price';
import { colors, fonts, radii, space } from '@/theme/tokens';

import { useCreateAlert } from './use-alerts';

type Kind = 'BELOW_THRESHOLD' | 'PRICE_DROP' | 'CHEAPER_NEARBY';

const KINDS: Kind[] = ['BELOW_THRESHOLD', 'PRICE_DROP', 'CHEAPER_NEARBY'];
const DROPS = [5, 10, 15, 20];

/**
 * "Avisame si baja": what to watch for, near where the shopper is. The alert
 * is in the currency of the prices around them and only hears about stores
 * within their usual radius, so a Buenos Aires alert never speaks of Vienna.
 */
export function NewAlertSheet({
  productId,
  productName,
  currency,
  cheapestCents,
  visible,
  onClose,
}: {
  productId: string;
  productName: string;
  /** The currency of the prices near the shopper, if any are known. */
  currency: string | null;
  /** The cheapest price near the shopper, to suggest a figure from. */
  cheapestCents: number | null;
  visible: boolean;
  onClose: () => void;
}) {
  const { location, radiusKm } = useShopperLocation();
  const create = useCreateAlert();
  const [kind, setKind] = useState<Kind>('PRICE_DROP');
  const [drop, setDrop] = useState(10);
  const [text, setText] = useState('');
  const [done, setDone] = useState(false);

  const suggested = cheapestCents ? Math.floor((cheapestCents * 0.95) / 100) * 100 : null;
  const cents = parsePrice(text);
  const invalid = text.trim() !== '' && cents === null;
  const point = location.status === 'ready' ? location.point : null;
  const ready = point !== null && currency !== null && (kind !== 'BELOW_THRESHOLD' || cents !== null);

  const close = () => {
    setDone(false);
    create.reset();
    onClose();
  };

  const submit = async () => {
    if (!point || !currency) return;
    await create.mutateAsync({
      productId,
      type: kind,
      currency,
      ...point,
      radiusKm,
      ...(kind === 'BELOW_THRESHOLD' ? { thresholdCents: cents! } : {}),
      ...(kind === 'PRICE_DROP' ? { dropPercent: drop } : {}),
    });
    setDone(true);
  };

  return (
    <Sheet title={t('alerts.create.title')} subtitle={productName} visible={visible} onClose={close}>
      {done ? (
        <View style={styles.group}>
          <Text variant="bodyStrong">{t('alerts.create.done')}</Text>
          <Button
            label={t('alerts.create.viewAlerts')}
            variant="secondary"
            onPress={() => {
              close();
              router.navigate('/inbox/alerts');
            }}
          />
          <Button label={t('common.close')} onPress={close} />
        </View>
      ) : (
        <View style={styles.group}>
          <View style={styles.chips}>
            {KINDS.map((option) => (
              <Chip key={option} label={t(`alerts.create.kinds.${option}`)} selected={kind === option} onPress={() => setKind(option)} />
            ))}
          </View>

          {kind === 'BELOW_THRESHOLD' ? (
            <View style={styles.group}>
              <Text variant="label">{t('alerts.create.whenBelow')}</Text>
              <View style={[styles.field, invalid && styles.fieldInvalid]}>
                <TextInput
                  value={text}
                  onChangeText={setText}
                  accessibilityLabel={t('alerts.create.limitLabel')}
                  placeholder={suggested ? priceInput(suggested) : t('alerts.create.pricePlaceholder')}
                  placeholderTextColor={colors.muted}
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
              </View>
              <Text variant="caption" tone={invalid ? 'danger' : 'muted'}>
                {invalid
                  ? t('alerts.create.invalidPrice')
                  : cheapestCents && currency
                    ? t('alerts.create.cheapestNow', { price: formatPrice(cheapestCents, currency) })
                    : t('alerts.create.perUnit')}
              </Text>
            </View>
          ) : null}

          {kind === 'PRICE_DROP' ? (
            <View style={styles.group}>
              <Text variant="label">{t('alerts.create.whenDrop')}</Text>
              <View style={styles.chips}>
                {DROPS.map((percent) => (
                  <Chip key={percent} label={`${percent}%`} selected={drop === percent} onPress={() => setDrop(percent)} />
                ))}
              </View>
            </View>
          ) : null}

          {kind === 'CHEAPER_NEARBY' ? (
            <Text tone="muted">{t('alerts.create.cheaperHelp')}</Text>
          ) : null}

          <Text variant="caption" tone="muted">
            {point ? t('alerts.create.nearRadius', { km: radiusKm }) : t('alerts.create.needLocation')}
            {currency === null && point ? t('alerts.create.noPricesNearby') : ''}
          </Text>
          {create.isError ? <Text tone="danger">{errorMessage(create.error)}</Text> : null}
          <Button label={t('alerts.create.submit')} disabled={!ready} loading={create.isPending} onPress={() => submit().catch(() => undefined)} />
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  group: { gap: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  field: {
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  fieldInvalid: { borderColor: colors.danger },
  input: { minWidth: 0, height: '100%', fontFamily: fonts.bodyBold, fontSize: 20, color: colors.ink },
});
