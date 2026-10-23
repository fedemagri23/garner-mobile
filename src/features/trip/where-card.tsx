import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { unwrap } from '@/api/client';
import type { components } from '@/api/types';
import { Sheet } from '@/components/sheet';
import { StateMessage } from '@/components/state-message';
import { Text } from '@/components/text';
import { useShopperLocation } from '@/features/location/location-provider';
import { t } from '@/i18n';
import { formatDistance } from '@/lib/format';
import { useSession } from '@/session/session-provider';
import { colors, fonts, MIN_TOUCH, radii, space } from '@/theme/tokens';

import { detectStore } from './detect-store';

export type NearbyStore = components['schemas']['NearbyStoreResponse'];

/** Detected from the phone, picked by hand, or deliberately none. */
export type StoreChoice = { kind: 'auto' } | { kind: 'store'; store: NearbyStore } | { kind: 'none' };

/** How far around the phone to offer shops to pick from. */
const AROUND_KM = 2;

/**
 * The shops around where the phone is — not the location chip's place, since
 * what matters is the shop the shopper is standing in — and the one they are
 * in, if any.
 */
export function useStoresAroundPhone() {
  const { api } = useSession();
  const { device } = useShopperLocation();

  const stores = useQuery({
    queryKey: ['stores-around-phone', device],
    enabled: !!device,
    staleTime: 60_000,
    queryFn: () =>
      unwrap(api.GET('/v1/stores/nearby', { params: { query: { ...device!, radiusKm: AROUND_KM, limit: 8 } } })),
  });

  const list = stores.data ?? [];
  return {
    stores: list,
    detected: detectStore(list),
    looking: device === undefined || (!!device && stores.isPending),
    noLocation: device === null,
  };
}

/** The shop a choice comes to: the detected one for `auto`. */
export const chosenStore = (choice: StoreChoice, detected: NearbyStore | null): NearbyStore | null =>
  choice.kind === 'store' ? choice.store : choice.kind === 'auto' ? detected : null;

/**
 * "¿Dónde comprás?": the shop the phone says the shopper is in, ready to go,
 * with "Cambiar" to pick another nearby or none. Picking is never required:
 * the recommendation is there so starting is one tap.
 */
export function WhereCard({
  choice,
  onChange,
}: {
  choice: StoreChoice;
  onChange: (choice: StoreChoice) => void;
}) {
  const { stores, detected, looking, noLocation } = useStoresAroundPhone();
  const [picking, setPicking] = useState(false);
  const store = chosenStore(choice, detected);

  let headline: string;
  let note: string;
  let icon: React.ComponentProps<typeof Ionicons>['name'] = 'storefront-outline';
  if (store) {
    headline = choice.kind === 'auto' ? t('trip.where.detected', { store: store.name }) : t('trip.where.chosen', { store: store.name });
    note =
      choice.kind === 'auto'
        ? t('trip.where.detectedNote', { distance: formatDistance(store.distanceKm) })
        : t('trip.where.chosenNote');
    icon = choice.kind === 'auto' ? 'navigate-circle-outline' : 'storefront-outline';
  } else if (choice.kind === 'none') {
    headline = t('trip.where.none');
    note = t('trip.where.noneNote');
  } else if (looking) {
    headline = t('trip.where.looking');
    note = '';
  } else {
    headline = t('trip.where.none');
    note = noLocation ? t('trip.where.noLocation') : t('trip.where.notDetected');
  }

  return (
    <View style={[styles.card, store && styles.cardFound]}>
      <Text variant="label" tone="muted">
        {t('trip.where.title')}
      </Text>
      <View style={styles.row}>
        <Ionicons name={icon} size={26} color={store ? colors.accent : colors.muted} />
        <View style={styles.text} accessibilityLiveRegion="polite">
          <Text variant="bodyStrong">{headline}</Text>
          {note ? (
            <Text variant="caption" tone="muted">
              {note}
            </Text>
          ) : null}
        </View>
        {looking && choice.kind === 'auto' ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('trip.where.changeLabel')}
            onPress={() => setPicking(true)}
            style={({ pressed }) => [styles.change, pressed && styles.pressed]}>
            <Text style={styles.changeText}>{store ? t('trip.where.change') : t('trip.where.choose')}</Text>
          </Pressable>
        )}
      </View>
      <Sheet title={t('trip.where.sheetTitle')} visible={picking} onClose={() => setPicking(false)}>
        <ScrollView style={styles.options}>
          <Option
            label={t('trip.where.auto')}
            note={detected ? t('trip.where.storeLabel', { store: detected.name, distance: formatDistance(detected.distanceKm) }) : undefined}
            icon="navigate-circle-outline"
            selected={choice.kind === 'auto'}
            onPress={() => {
              onChange({ kind: 'auto' });
              setPicking(false);
            }}
          />
          {stores.length === 0 && !looking ? <StateMessage message={t('trip.where.noStoresNear')} /> : null}
          {stores.map((option) => (
            <Option
              key={option.id}
              label={option.name}
              note={formatDistance(option.distanceKm)}
              accessibilityLabel={t('trip.where.storeLabel', { store: option.name, distance: formatDistance(option.distanceKm) })}
              icon="storefront-outline"
              selected={choice.kind === 'store' && choice.store.id === option.id}
              onPress={() => {
                onChange({ kind: 'store', store: option });
                setPicking(false);
              }}
            />
          ))}
          <Option
            label={t('trip.where.noneOption')}
            note={t('trip.where.noneNote')}
            icon="git-branch-outline"
            selected={choice.kind === 'none'}
            onPress={() => {
              onChange({ kind: 'none' });
              setPicking(false);
            }}
          />
        </ScrollView>
      </Sheet>
    </View>
  );
}

function Option({
  label,
  note,
  icon,
  selected,
  accessibilityLabel,
  onPress,
}: {
  label: string;
  note?: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  selected: boolean;
  accessibilityLabel?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.pressed]}>
      <Ionicons name={icon} size={22} color={selected ? colors.accent : colors.muted} />
      <View style={styles.text}>
        <Text variant="bodyStrong">{label}</Text>
        {note ? (
          <Text variant="caption" tone="muted">
            {note}
          </Text>
        ) : null}
      </View>
      {selected ? <Ionicons name="checkmark" size={20} color={colors.accent} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.sm,
    padding: space.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
  },
  cardFound: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  text: { flex: 1, gap: 2 },
  change: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: MIN_TOUCH / 2,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
  },
  changeText: { fontFamily: fonts.bodySemi, fontSize: 14 },
  pressed: { opacity: 0.8 },
  options: { flexGrow: 0 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 56,
    paddingHorizontal: space.md,
    borderRadius: radii.md,
  },
  optionSelected: { backgroundColor: colors.accentSoft },
});
