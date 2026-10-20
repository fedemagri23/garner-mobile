import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { StateMessage } from '@/components/state-message';
import { Text } from '@/components/text';
import { useList } from '@/features/lists/use-lists';
import { useStartTrip } from '@/features/trip/use-trip';
import { useShopperLocation } from '@/features/location/location-provider';
import { errorMessage } from '@/lib/error-message';
import { formatPrice, productCount } from '@/lib/format';
import { colors, fonts, MIN_TOUCH, radii, space } from '@/theme/tokens';

import type { MapStop } from './map-types';
import { PreferencesSheet } from './preferences-sheet';
import { StopsMap } from './stops-map';
import { MODES, planFor, useOptimization, useRequestPlan, type Mode, type Plan, type PlanStop } from './use-plan';
import { extraKm, extraMinutes, joinNames, VIOLATION } from './wording';

const MAP_HEIGHT = 260;

/**
 * "¿Dónde conviene comprar?": the three ways to buy a list — one store, the
 * balance, the cheapest — with what each saves and costs in travel, and the
 * stops of the chosen one on a map.
 */
export function PlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const list = useList(id);
  const { location } = useShopperLocation();
  const request = useRequestPlan(id);
  const optimization = useOptimization(request.data?.id);
  const [mode, setMode] = useState<Mode | null>(null);
  const [editing, setEditing] = useState(false);
  const start = useStartTrip();

  // Ask as soon as there is somewhere to ask from, and again after a reset.
  useEffect(() => {
    if (location.status === 'ready' && request.isIdle) {
      request.mutate();
    }
  }, [location.status, request]);

  const again = (newMode?: Mode) => {
    if (newMode) setMode(newMode);
    request.reset();
  };

  const result = optimization.data?.status === 'COMPLETED' ? optimization.data.result : null;
  const currency = result?.currency ?? list.data?.currency ?? 'ARS';
  const shown = result ? (mode ?? result.recommended) : null;
  const plan = result && shown ? planFor(result, shown) : null;
  const stops: MapStop[] = (plan?.stores ?? []).flatMap((stop) =>
    stop.latitude === null || stop.longitude === null
      ? []
      : [
          {
            order: stop.order,
            name: stop.storeName,
            shortName: stop.supermarketName,
            latitude: stop.latitude,
            longitude: stop.longitude,
          },
        ],
  );

  let body;
  if (location.status === 'none') {
    body = <StateMessage message="Necesitamos tu ubicación para saber qué súper te quedan cerca." />;
  } else if (request.isError) {
    body = (
      <StateMessage
        tone="danger"
        message={errorMessage(request.error, { 409: 'La lista está vacía: agregale productos primero.' })}
      />
    );
  } else if (optimization.data?.status === 'FAILED') {
    body = <StateMessage tone="danger" message="No pudimos calcular el plan. Probá de nuevo en un rato." />;
  } else if (optimization.isError) {
    body = <StateMessage tone="danger" message={errorMessage(optimization.error)} />;
  } else if (!result) {
    body = <StateMessage loading message="Comparando precios en los súper cerca tuyo…" />;
  } else if (!result.cheapest && !result.bestBalance && !result.simplest) {
    body = (
      <StateMessage
        message={`Ningún súper cerca tuyo tiene precios en ${currency === 'EUR' ? 'euros' : currency === 'ARS' ? 'pesos' : currency} para esta lista.`}
      />
    );
  } else {
    body = (
      <>
        <View style={styles.tabs} accessibilityRole="tablist">
          {MODES.map((entry) => {
            const selected = entry.mode === shown;
            return (
              <Pressable
                key={entry.mode}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => setMode(entry.mode)}
                style={[styles.tab, selected && styles.tabSelected]}>
                <Text style={[styles.tabText, selected && styles.tabTextSelected]}>{entry.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {plan ? (
          <PlanDetails plan={plan} currency={currency} />
        ) : (
          <StateMessage message="No hay un plan así dentro de tus preferencias." />
        )}
        <Notes plan={plan} result={result} currency={currency} />
      </>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.map}>
        {optimization.data ? <StopsMap origin={optimization.data.origin} stops={stops} /> : null}
        <TopBar title={list.data?.name} />
      </View>
      {/* The actions scroll with the plan rather than sitting fixed at the
          bottom: on iOS only scrolling content clears the floating tab bar
          (MBUG-011). */}
      <ScrollView
        style={styles.sheet}
        contentContainerStyle={styles.sheetContent}
        contentInsetAdjustmentBehavior="automatic">
        {body}
        {plan && optimization.data ? (
          <Button
            label="Empezar la compra"
            accessibilityLabel={`Empezar la compra: ${MODES.find((entry) => entry.mode === shown)?.label ?? ''}`}
            loading={start.isPending}
            onPress={() =>
              start
                .mutateAsync({ listId: id, optimizationId: optimization.data!.id, mode: shown ?? undefined })
                .then(() => router.navigate('/shop'))
                .catch(() => undefined)
            }
          />
        ) : null}
        {start.isError ? <Text tone="danger">{errorMessage(start.error)}</Text> : null}
        <View style={styles.footer}>
          <Button label="Preferencias" variant="secondary" onPress={() => setEditing(true)} style={styles.footerButton} />
          <Button
            label="Recalcular"
            variant="secondary"
            disabled={location.status !== 'ready' || request.isPending}
            onPress={() => again()}
            style={styles.footerButton}
          />
        </View>
      </ScrollView>
      <PreferencesSheet visible={editing} onClose={() => setEditing(false)} onSaved={again} />
    </View>
  );
}

function TopBar({ title }: { title?: string }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.topBar, { top: insets.top + space.sm }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Volver"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/lists'))}
        style={styles.round}>
        <Ionicons name="chevron-back" size={20} color={colors.ink} />
      </Pressable>
      {title ? (
        <View style={styles.titlePill}>
          <Text variant="label" numberOfLines={1}>
            {title}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function PlanDetails({ plan, currency }: { plan: Plan; currency: string }) {
  return (
    <>
      <View style={styles.stats}>
        <Stat label="Ahorrás" value={formatPrice(plan.savingsCents, currency)} accent />
        <Stat label="Recorrido" value={extraKm(plan.additionalDistanceKm)} />
        <Stat label="Tiempo aprox." value={extraMinutes(plan.additionalMinutes)} />
      </View>
      <View style={styles.stops}>
        {plan.stores.map((stop, index) => (
          <Stop key={stop.storeId} stop={stop} currency={currency} last={index === plan.stores.length - 1} />
        ))}
        <View style={styles.totalRow}>
          <Text tone="muted">Total</Text>
          <Text style={styles.total}>{formatPrice(plan.totalCents, currency)}</Text>
        </View>
      </View>
    </>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <Text style={styles.statValue} tone={accent ? 'accent' : 'ink'} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

/** One stop; tapping it shows what to buy there. */
function Stop({ stop, currency, last }: { stop: PlanStop; currency: string; last: boolean }) {
  const [open, setOpen] = useState(false);
  const names = stop.items.map((item) => item.productName);
  const preview = names.length > 2 ? `${names.slice(0, 2).join(', ')}…` : names.join(', ');

  return (
    <View style={styles.stopDivider}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`Parada ${stop.order}: ${stop.storeName}, ${productCount(stop.items.length)}, ${formatPrice(stop.subtotalCents, currency)}`}
        onPress={() => setOpen((value) => !value)}
        style={styles.stop}>
        <View style={styles.order}>
          <Text style={styles.orderText} tone="onAccent">
            {stop.order}
          </Text>
        </View>
        <View style={styles.stopText}>
          <Text variant="bodyStrong">{stop.storeName}</Text>
          <Text variant="caption" tone="muted" numberOfLines={open ? undefined : 1}>
            {open && stop.addressLine ? stop.addressLine : `${productCount(stop.items.length)} · ${preview}`}
          </Text>
        </View>
        <Text style={styles.subtotal}>{formatPrice(stop.subtotalCents, currency)}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.muted} />
      </Pressable>
      {open ? (
        <View style={styles.items}>
          {stop.items.map((item) => (
            <View key={item.productId} style={styles.item}>
              <Text variant="caption" style={styles.itemName}>
                {item.quantity} × {item.productName}
              </Text>
              <Text variant="caption" style={styles.itemPrice}>
                {formatPrice(item.lineTotalCents, currency)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {last ? null : <View style={styles.hairline} />}
    </View>
  );
}

function Notes({
  plan,
  result,
  currency,
}: {
  plan: Plan | null;
  result: NonNullable<ReturnType<typeof useOptimization>['data']>['result'];
  currency: string;
}) {
  if (!result) return null;
  const notes: string[] = ['Distancias y tiempos estimados.'];

  const missing = [...new Set([...(plan?.missingProducts ?? []), ...result.unavailableProducts])];
  if (missing.length > 0) {
    notes.push(`No encontramos cerca: ${joinNames(missing)}.`);
  }

  const cheaper = result.rejectedCheaperAlternatives[0];
  if (cheaper && plan && cheaper.plan.totalCents < plan.totalCents) {
    const reasons = cheaper.violations.map((code) => VIOLATION[code] ?? code);
    notes.push(
      `Hay un plan ${formatPrice(plan.totalCents - cheaper.plan.totalCents, currency)} más barato, pero ${joinNames(reasons)}.`,
    );
  }

  return (
    <Text variant="caption" tone="muted" style={styles.notes}>
      {notes.join(' ')}
    </Text>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  map: { height: MAP_HEIGHT, backgroundColor: '#E4E9E1' },
  topBar: { position: 'absolute', left: space.xl, right: space.xl, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  round: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: MIN_TOUCH / 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titlePill: {
    flexShrink: 1,
    height: 36,
    paddingHorizontal: space.md,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  sheet: { flex: 1, marginTop: -20, borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: colors.ground },
  sheetContent: { padding: space.xl, gap: space.lg },
  tabs: { flexDirection: 'row', gap: 4, padding: 4, backgroundColor: '#E4E9E1', borderRadius: radii.md },
  tab: { flex: 1, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tabSelected: { backgroundColor: colors.surface },
  tabText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.inkSoft },
  tabTextSelected: { fontFamily: fonts.bodyBold, color: colors.ink },
  stats: { flexDirection: 'row', gap: space.sm },
  stat: {
    flex: 1,
    padding: space.md,
    gap: 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
  },
  statValue: { fontFamily: fonts.display, fontSize: 20, fontVariant: ['tabular-nums'] },
  stops: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radii.lg },
  stopDivider: {},
  stop: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, minHeight: MIN_TOUCH },
  hairline: { height: 1, backgroundColor: colors.surfaceMuted },
  order: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  orderText: { fontFamily: fonts.bodyBold, fontSize: 14 },
  stopText: { flex: 1, gap: 2 },
  subtotal: { fontFamily: fonts.bodyBold, fontSize: 16, fontVariant: ['tabular-nums'] },
  items: { paddingLeft: 58, paddingRight: space.lg, paddingBottom: space.md, gap: 4 },
  item: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
  itemName: { flex: 1 },
  itemPrice: { fontVariant: ['tabular-nums'] },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    padding: space.lg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  total: { fontFamily: fonts.display, fontSize: 20, fontVariant: ['tabular-nums'] },
  notes: { lineHeight: 19 },
  footer: { flexDirection: 'row', gap: space.sm },
  footerButton: { flex: 1 },
});
