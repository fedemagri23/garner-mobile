import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { useShopperLocation } from '@/features/location/location-provider';
import { errorMessage } from '@/lib/error-message';
import { formatPrice } from '@/lib/format';
import { parsePrice, priceInput } from '@/lib/parse-price';
import { colors, fonts, radii, space } from '@/theme/tokens';

import { useCreateAlert } from './use-alerts';

type Kind = 'BELOW_THRESHOLD' | 'PRICE_DROP' | 'CHEAPER_NEARBY';

const KINDS: { kind: Kind; label: string }[] = [
  { kind: 'BELOW_THRESHOLD', label: 'Baja de un precio' },
  { kind: 'PRICE_DROP', label: 'Baja un porcentaje' },
  { kind: 'CHEAPER_NEARBY', label: 'Más barato cerca' },
];
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
    <Sheet title="Avisame si baja" subtitle={productName} visible={visible} onClose={close}>
      {done ? (
        <View style={styles.group}>
          <Text variant="bodyStrong">Listo: te avisamos en Avisos.</Text>
          <Button
            label="Ver mis alertas"
            variant="secondary"
            onPress={() => {
              close();
              router.navigate('/inbox/alerts');
            }}
          />
          <Button label="Cerrar" onPress={close} />
        </View>
      ) : (
        <View style={styles.group}>
          <View style={styles.chips}>
            {KINDS.map((option) => (
              <Chip key={option.kind} label={option.label} selected={kind === option.kind} onPress={() => setKind(option.kind)} />
            ))}
          </View>

          {kind === 'BELOW_THRESHOLD' ? (
            <View style={styles.group}>
              <Text variant="label">Avisame cuando cueste menos de</Text>
              <View style={[styles.field, invalid && styles.fieldInvalid]}>
                <TextInput
                  value={text}
                  onChangeText={setText}
                  accessibilityLabel="Precio límite"
                  placeholder={suggested ? priceInput(suggested) : 'Precio'}
                  placeholderTextColor={colors.muted}
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
              </View>
              <Text variant="caption" tone={invalid ? 'danger' : 'muted'}>
                {invalid
                  ? 'Ese precio no se entiende. Probá con 1.150 o 1,15.'
                  : cheapestCents && currency
                    ? `Hoy lo más barato cerca tuyo es ${formatPrice(cheapestCents, currency)}.`
                    : 'El precio por unidad.'}
              </Text>
            </View>
          ) : null}

          {kind === 'PRICE_DROP' ? (
            <View style={styles.group}>
              <Text variant="label">Avisame cuando baje por lo menos</Text>
              <View style={styles.chips}>
                {DROPS.map((percent) => (
                  <Chip key={percent} label={`${percent}%`} selected={drop === percent} onPress={() => setDrop(percent)} />
                ))}
              </View>
            </View>
          ) : null}

          {kind === 'CHEAPER_NEARBY' ? (
            <Text tone="muted">Te avisamos cuando un súper cerca tuyo pase a ser el más barato para este producto.</Text>
          ) : null}

          <Text variant="caption" tone="muted">
            {point ? `Cerca tuyo, a menos de ${radiusKm} km.` : 'Necesitamos tu ubicación para saber qué es “cerca”.'}
            {currency === null && point ? ' Todavía no conocemos precios cerca tuyo.' : ''}
          </Text>
          {create.isError ? <Text tone="danger">{errorMessage(create.error)}</Text> : null}
          <Button label="Crear alerta" disabled={!ready} loading={create.isPending} onPress={() => submit().catch(() => undefined)} />
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
