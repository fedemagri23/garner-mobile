import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { StateMessage } from '@/components/state-message';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { useShopperLocation } from '@/features/location/location-provider';
import { CURRENCY_BY_COUNTRY } from '@/features/location/use-local-currency';
import type { MapPoint } from '@/features/plan/map-types';
import { useStoresNear } from '@/features/contributions/use-contributions';
import { t } from '@/i18n';
import { errorMessage } from '@/lib/error-message';
import { colors, MIN_TOUCH, space } from '@/theme/tokens';

import { PinMap } from './pin-map';
import { ProgressCard } from './progress-card';
import { useAddStore, useSupermarkets, type Store } from './use-community';
import { nameProblem } from './validate';

/** Countries whose prices the app can take, so a shop anywhere else would be of no use yet. */
const COUNTRIES = Object.keys(CURRENCY_BY_COUNTRY);
/** How many products need a price before everyone sees a new shop (the server's rule). */
const PRODUCTS_NEEDED = 10;
const OTHER = 'other';

/** The phone's own time zone: the shop is where the shopper is standing. */
const deviceTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
};

/**
 * "Agregar tienda": the chain (or a new one), a pin on the map starting where
 * the shopper is, a name and an address. Private to them until enough
 * products are priced there.
 */
export function AddStoreScreen() {
  const { location } = useShopperLocation();
  const supermarkets = useSupermarkets();
  const nearest = useStoresNear(1);
  const add = useAddStore();

  const [chain, setChain] = useState<string | null>(null);
  const [chainName, setChainName] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState<string | null>(null);
  const [point, setPoint] = useState<MapPoint | null>(null);
  const [touched, setTouched] = useState(false);

  const start = location.status === 'ready' ? location.point : null;
  const pin = point ?? start;

  // The street, city and country where the pin starts, read from the map
  // where the phone can; the web cannot, and the shopper types them.
  useEffect(() => {
    if (!start || Platform.OS === 'web') return;
    let cancelled = false;
    Location.reverseGeocodeAsync(start)
      .then(([place]) => {
        if (cancelled || !place) return;
        const street = [place.street, place.streetNumber].filter(Boolean).join(' ');
        setAddress((typed) => typed || street);
        setCity((typed) => typed || place.city || place.subregion || '');
        setCountry((chosen) => chosen ?? (place.isoCountryCode && COUNTRIES.includes(place.isoCountryCode) ? place.isoCountryCode : null));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [start?.latitude, start?.longitude]); // eslint-disable-line react-hooks/exhaustive-deps

  // Otherwise the country of the nearest shop the app knows.
  const guessedCountry = nearest.data?.[0]?.country;
  const chosenCountry = country ?? (guessedCountry && COUNTRIES.includes(guessedCountry) ? guessedCountry : null);

  const chosenChain = supermarkets.data?.find((option) => option.id === chain);
  const problems = {
    chain: chain === null ? t('community.validation.required') : chain === OTHER ? nameProblem(chainName, { max: 80 }) : null,
    name: nameProblem(name, { max: 120 }),
    address: nameProblem(address),
    city: nameProblem(city, { min: 1, max: 120 }),
    country: chosenCountry ? null : t('community.validation.required'),
  };
  const valid = Object.values(problems).every((problem) => problem === null);
  const show = (problem: string | null) => (touched ? (problem ?? undefined) : undefined);

  const submit = () => {
    setTouched(true);
    if (!valid || !pin || !chosenCountry) return;
    add.mutate({
      ...(chain === OTHER ? { supermarketName: chainName.trim() } : { supermarketId: chain! }),
      name: name.trim(),
      addressLine: address.trim(),
      city: city.trim(),
      country: chosenCountry,
      latitude: pin.latitude,
      longitude: pin.longitude,
      timeZone: deviceTimeZone(),
    });
  };

  if (add.data) {
    return <Added store={add.data} />;
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            onPress={() => router.back()}
            style={styles.round}>
            <Ionicons name="close" size={22} color={colors.ink} />
          </Pressable>
          <Text variant="heading" accessibilityRole="header">
            {t('community.addStore.title')}
          </Text>
          <View style={styles.roundSpacer} />
        </View>
        <Text tone="muted">{t('community.addStore.intro', { count: PRODUCTS_NEEDED })}</Text>

        <View style={styles.group}>
          <Text variant="label">{t('community.addStore.chain')}</Text>
          <View style={styles.wrap} accessibilityRole="radiogroup">
            {supermarkets.data?.map((option) => (
              <Chip
                key={option.id}
                label={option.name}
                selected={option.id === chain}
                onPress={() => {
                  setChain(option.id);
                  setName((typed) => typed || option.name);
                }}
              />
            ))}
            <Chip label={t('community.addStore.chainOther')} selected={chain === OTHER} onPress={() => setChain(OTHER)} />
          </View>
          {chain === OTHER ? (
            <TextField
              label={t('community.addStore.chainName')}
              placeholder={t('community.addStore.chainPlaceholder')}
              value={chainName}
              onChangeText={setChainName}
              autoCapitalize="words"
              error={show(problems.chain)}
            />
          ) : show(problems.chain) ? (
            <Text variant="caption" tone="danger">
              {problems.chain}
            </Text>
          ) : null}
        </View>

        <TextField
          label={t('community.addStore.name')}
          placeholder={chosenChain ? `${chosenChain.name} …` : t('community.addStore.namePlaceholder')}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          error={show(problems.name)}
        />

        <View style={styles.group}>
          <Text variant="label">{t('community.addStore.where')}</Text>
          {pin ? (
            <>
              <PinMap point={pin} onChange={setPoint} />
              {Platform.OS !== 'web' ? (
                <Text variant="caption" tone="muted">
                  {t('community.addStore.whereHint')}
                </Text>
              ) : null}
            </>
          ) : location.status === 'locating' ? (
            <StateMessage loading />
          ) : (
            <StateMessage message={t('community.addStore.needLocation')} />
          )}
        </View>

        <TextField
          label={t('community.addStore.address')}
          placeholder={t('community.addStore.addressPlaceholder')}
          value={address}
          onChangeText={setAddress}
          error={show(problems.address)}
        />
        <TextField
          label={t('community.addStore.city')}
          value={city}
          onChangeText={setCity}
          autoCapitalize="words"
          error={show(problems.city)}
        />
        <View style={styles.group}>
          <Text variant="label">{t('community.addStore.country')}</Text>
          <View style={styles.wrap} accessibilityRole="radiogroup">
            {COUNTRIES.map((code) => (
              <Chip key={code} label={code} selected={code === chosenCountry} onPress={() => setCountry(code)} />
            ))}
          </View>
          {show(problems.country) ? (
            <Text variant="caption" tone="danger">
              {problems.country}
            </Text>
          ) : null}
        </View>

        {add.isError ? (
          <Text tone="danger" accessibilityLiveRegion="polite">
            {errorMessage(add.error, {
              409: t('community.addStore.duplicate'),
              429: t('community.addStore.dailyLimit'),
            })}
          </Text>
        ) : null}
        <Button label={t('community.addStore.submit')} loading={add.isPending} disabled={!pin} onPress={submit} />
      </ScrollView>
    </SafeAreaView>
  );
}

/** After adding: only the shopper sees it, and how to change that. */
function Added({ store }: { store: Store }) {
  const progress = store.publication;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, styles.done]}>
        <View style={styles.center}>
          <Ionicons name="checkmark-circle" size={56} color={colors.accent} />
        </View>
        <Text variant="title" accessibilityRole="header" style={styles.centerText}>
          {t('community.addStore.added')}
        </Text>
        <Text tone="muted" style={styles.centerText}>
          {store.name} · {store.addressLine}
        </Text>
        {progress ? <ProgressCard priced={progress.pricedProducts} needed={progress.productsNeeded} /> : null}
        <Button
          label={t('community.addStore.findProduct')}
          onPress={() => {
            router.back();
            router.navigate('/search');
          }}
        />
        <Button label={t('community.addStore.done')} variant="secondary" onPress={() => router.back()} />
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
  group: { gap: space.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  done: { paddingTop: space.xxxl },
  center: { alignItems: 'center' },
  centerText: { textAlign: 'center' },
});
