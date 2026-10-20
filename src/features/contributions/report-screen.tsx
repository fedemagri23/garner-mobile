import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ProductTile } from '@/components/product-tile';
import { StateMessage } from '@/components/state-message';
import { Text } from '@/components/text';
import { useProduct } from '@/features/catalog/use-catalog';
import { useShopperLocation } from '@/features/location/location-provider';
import { CURRENCY_BY_COUNTRY } from '@/features/location/use-local-currency';
import { useOutbox } from '@/features/outbox/outbox-provider';
import { SyncBanner } from '@/features/outbox/sync-banner';
import { useProductPrices } from '@/features/prices/use-prices';
import { errorMessage } from '@/lib/error-message';
import { formatDistance, formatPrice } from '@/lib/format';
import { parsePrice } from '@/lib/parse-price';
import { colors, fonts, MIN_TOUCH, radii, space } from '@/theme/tokens';

import { canUseCamera, pickPhoto } from './photo';
import { useReportPrice, useStoresNear, type NearbyStore } from './use-contributions';

/**
 * "Informar precio": where you are, what the shelf says, and — if you want —
 * a photo of the label, which makes the report weigh more. Sent when it can
 * be, so it works in an aisle with no signal.
 */
export function ReportScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const product = useProduct(productId);
  const stores = useStoresNear();
  const prices = useProductPrices(productId);
  const { location } = useShopperLocation();
  const report = useReportPrice();

  const [storeId, setStoreId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  const list = stores.data ?? [];
  // The nearest store is where you most likely are.
  const chosen = list.find((store) => store.id === storeId) ?? list[0] ?? null;
  const currency = chosen ? CURRENCY_BY_COUNTRY[chosen.country] : undefined;
  const cents = parsePrice(text);
  const invalid = text.trim() !== '' && cents === null;
  const lastHere = (id: string) => prices.data?.prices.find((price) => price.storeId === id);

  const take = async (source: 'camera' | 'library') => {
    setPhotoError(null);
    try {
      const result = await pickPhoto(source);
      if (result && 'error' in result) setPhotoError(result.error);
      else if (result) setPhoto(result.photo.uri);
    } catch {
      setPhotoError('No pudimos abrir la cámara. Probá de nuevo.');
    }
  };

  const submit = () => {
    if (!chosen || !product.data || cents === null || !currency) return;
    setSent(
      report({
        productId,
        productName: product.data.name,
        storeId: chosen.id,
        storeName: chosen.name,
        priceCents: cents,
        currency,
        photoUri: photo,
      }),
    );
  };

  if (sent) {
    return <Thanks reportId={sent} />;
  }

  let storesBody;
  if (location.status === 'none') {
    storesBody = <StateMessage message="Necesitamos tu ubicación para saber en qué súper estás." />;
  } else if (location.status === 'locating' || stores.isPending) {
    storesBody = <StateMessage loading />;
  } else if (stores.isError) {
    storesBody = <StateMessage tone="danger" message={errorMessage(stores.error)} />;
  } else if (list.length === 0) {
    storesBody = <StateMessage message="No hay súper conocidos cerca tuyo. Todavía no podemos aceptar el precio." />;
  } else {
    storesBody = list.map((store, index) => (
      <StoreRow
        key={store.id}
        store={store}
        selected={store.id === chosen?.id}
        lastPrice={lastHere(store.id)}
        last={index === list.length - 1}
        onPress={() => setStoreId(store.id)}
      />
    ));
  }

  const symbol = currency === 'EUR' ? '€' : currency === 'ARS' ? '$' : (currency ?? '');
  const ready = !!chosen && !!product.data && cents !== null && !!currency;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
            onPress={() => router.back()}
            style={styles.round}>
            <Ionicons name="close" size={22} color={colors.ink} />
          </Pressable>
          <Text variant="heading" accessibilityRole="header">
            Informar precio
          </Text>
          <View style={styles.roundSpacer} />
        </View>

        <SyncBanner />

        {product.data ? (
          <View style={styles.product}>
            <ProductTile name={product.data.name} imageUrl={product.data.imageUrl} size={52} />
            <View style={styles.productText}>
              <Text variant="bodyStrong">{product.data.name}</Text>
              <Text variant="caption" tone="muted">
                {[product.data.brand?.name, product.data.packageLabel].filter(Boolean).join(' · ')}
              </Text>
            </View>
          </View>
        ) : product.isError ? (
          <StateMessage tone="danger" message={errorMessage(product.error)} />
        ) : (
          <StateMessage loading />
        )}

        <View style={styles.group}>
          <Text variant="label">¿En qué súper estás?</Text>
          <View style={styles.card}>{storesBody}</View>
        </View>

        <View style={styles.group}>
          <Text variant="label">Precio en góndola</Text>
          <View style={[styles.priceField, invalid && styles.priceFieldInvalid]}>
            <Text style={styles.symbol} tone="muted">
              {symbol}
            </Text>
            <TextInput
              value={text}
              onChangeText={setText}
              accessibilityLabel="Precio en góndola"
              placeholder="0"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              returnKeyType="done"
              style={styles.priceInput}
            />
          </View>
          <Text variant="caption" tone={invalid ? 'danger' : 'muted'}>
            {invalid ? 'Ese precio no se entiende. Probá con 1.150 o 1,15.' : 'El precio de una unidad, como dice el cartel.'}
          </Text>
          {chosen && !currency ? (
            <Text variant="caption" tone="danger">
              Todavía no aceptamos precios en {chosen.country}.
            </Text>
          ) : null}
        </View>

        <View style={styles.group}>
          {photo ? (
            <View style={styles.photoRow}>
              <Image source={photo} style={styles.thumb} contentFit="cover" accessibilityLabel="Foto del cartel" />
              <View style={styles.photoText}>
                <Text variant="bodyStrong">Foto del cartel</Text>
                <Text variant="caption" tone="accent">
                  Pesa más
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Quitar la foto"
                onPress={() => setPhoto(null)}
                style={styles.round}>
                <Ionicons name="trash-outline" size={20} color={colors.ink} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.photoButtons}>
              {canUseCamera ? (
                <PhotoButton icon="camera-outline" label="Sacar foto del cartel" onPress={() => take('camera')} />
              ) : null}
              <PhotoButton icon="image-outline" label="Elegir una foto" onPress={() => take('library')} />
            </View>
          )}
          {photoError ? <Text tone="danger">{photoError}</Text> : null}
          <Text variant="caption" tone="muted">
            La foto es opcional. Con ella, tu precio pesa más para los demás.
          </Text>
        </View>

        <Button label="Enviar precio" disabled={!ready} onPress={submit} />
        {chosen && cents !== null && currency ? (
          <Text variant="caption" tone="muted" style={styles.center}>
            {formatPrice(cents, currency)} en {chosen.name}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function StoreRow({
  store,
  selected,
  lastPrice,
  last,
  onPress,
}: {
  store: NearbyStore;
  selected: boolean;
  lastPrice: { priceCents: number; currency: string } | undefined;
  last: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${store.name}, a ${formatDistance(store.distanceKm)}`}
      onPress={onPress}
      style={[styles.storeRow, !last && styles.divider, selected && styles.storeRowSelected]}>
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={22}
        color={selected ? colors.accent : colors.muted}
      />
      <View style={styles.storeText}>
        <Text variant="bodyStrong">{store.name}</Text>
        <Text variant="caption" tone="muted">
          {formatDistance(store.distanceKm)}
          {lastPrice ? ` · último precio acá ${formatPrice(lastPrice.priceCents, lastPrice.currency)}` : ''}
        </Text>
      </View>
    </Pressable>
  );
}

function PhotoButton({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.photoButton, pressed && styles.pressed]}>
      <Ionicons name={icon} size={22} color={colors.ink} />
      <Text style={styles.photoButtonText}>{label}</Text>
    </Pressable>
  );
}

/** After sending: whether it has reached the server yet, in plain words. */
function Thanks({ reportId }: { reportId: string }) {
  const { queue, online } = useOutbox();
  const waiting = queue.some((change) => change.id === reportId);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, styles.thanks]}>
        <SyncBanner />
        <View style={styles.checkmark}>
          <Ionicons name="checkmark-circle" size={56} color={colors.accent} />
        </View>
        <Text variant="title" accessibilityRole="header" style={styles.center}>
          ¡Gracias!
        </Text>
        <Text tone="muted" style={styles.center}>
          {waiting
            ? online
              ? 'Estamos enviando tu precio.'
              : 'Tu precio se envía cuando vuelva la conexión; no hace falta que hagas nada.'
            : 'Tu precio ya llegó. Ayuda a que otros paguen menos.'}
        </Text>
        <Button label="Listo" onPress={() => router.back()} />
        <Button
          label="Ver mis aportes"
          variant="secondary"
          onPress={() => {
            router.back();
            router.navigate('/contributions');
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  content: { padding: space.xl, gap: space.lg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
  roundSpacer: { width: MIN_TOUCH },
  product: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  productText: { flex: 1, gap: 2 },
  group: { gap: space.sm },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radii.lg, overflow: 'hidden' },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, padding: space.md, paddingHorizontal: space.lg },
  storeRowSelected: { backgroundColor: colors.accentSoft },
  storeText: { flex: 1, gap: 2 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.surfaceMuted },
  priceField: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: space.lg,
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  priceFieldInvalid: { borderColor: colors.danger },
  symbol: { fontFamily: fonts.display, fontSize: 28 },
  // minWidth 0: a text field will not shrink below its own default width otherwise.
  priceInput: { flex: 1, minWidth: 0, height: '100%', fontFamily: fonts.display, fontSize: 30, color: colors.ink },
  photoButtons: { gap: space.sm },
  photoButton: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#9AA79E',
    borderRadius: radii.md,
  },
  photoButtonText: { fontFamily: fonts.bodySemi, fontSize: 15 },
  pressed: { backgroundColor: colors.surfaceMuted },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  thumb: { width: 64, height: 64, borderRadius: radii.sm, backgroundColor: colors.surfaceMuted },
  photoText: { flex: 1, gap: 2 },
  center: { textAlign: 'center' },
  checkmark: { alignItems: 'center' },
  thanks: { alignItems: 'stretch', paddingTop: space.xxxl },
});
