import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Sheet } from '@/components/sheet';
import { pendingItemIds } from '@/features/outbox/changes';
import { useOutbox } from '@/features/outbox/outbox-provider';
import { SyncBanner } from '@/features/outbox/sync-banner';
import { Text } from '@/components/text';
import { formatPrice } from '@/lib/format';
import { parsePrice, priceInput } from '@/lib/parse-price';
import { colors, fonts, MIN_TOUCH, radii, space } from '@/theme/tokens';

import { firstOpenStop, spentAt, stopsOf, type Stop, type Trip, type TripItem } from './stops';
import { useTripActions } from './use-trip';

/**
 * Shopping, one stop at a time: the next thing to pick up with the price on
 * the shelf, the rest of the stop below it, and what has been spent there.
 */
export function TripView({ trip, onCompleted }: { trip: Trip; onCompleted: (trip: Trip) => void }) {
  const stops = stopsOf(trip);
  const [stopIndex, setStopIndex] = useState(() => firstOpenStop(stops));
  const [focusId, setFocusId] = useState<string | null>(null);
  const [options, setOptions] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const actions = useTripActions(trip);
  const { queue } = useOutbox();
  const waiting = pendingItemIds(queue, trip.id);

  const stop = stops[Math.min(stopIndex, stops.length - 1)];
  const open = stop.items.filter((item) => !item.isPurchased);
  const focus = open.find((item) => item.id === focusId) ?? open[0] ?? null;
  const done = stop.items.length - open.length;
  const last = stopIndex >= stops.length - 1;
  const title = stop.storeName ?? trip.listName;

  const goTo = (index: number) => {
    setStopIndex(index);
    setFocusId(null);
  };

  const toggle = (item: TripItem) =>
    actions.record(
      item.id,
      item.isPurchased ? { isPurchased: false } : { isPurchased: true, purchasedAt: new Date().toISOString() },
    );

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled">
        <SyncBanner />

        {trip.status === 'PAUSED' ? (
          <View style={styles.paused} accessibilityRole="alert">
            <Text style={styles.pausedText}>Compra en pausa</Text>
            <Button
              label="Seguir"
              variant="secondary"
              onPress={() => actions.status('resume')}
              style={styles.pausedButton}
            />
          </View>
        ) : null}

        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.overline} tone="muted">
              {stops.length > 1 ? `Parada ${stopIndex + 1} de ${stops.length}` : trip.listName}
            </Text>
            <Text variant="title" style={styles.title} accessibilityRole="header">
              {title}
            </Text>
          </View>
          <Text style={styles.count} accessibilityLabel={`${done} de ${stop.items.length} comprados`}>
            {done} / {stop.items.length}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Opciones de la compra"
            onPress={() => setOptions(true)}
            style={styles.round}>
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.ink} />
          </Pressable>
        </View>
        <View
          style={styles.progress}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: stop.items.length, now: done }}>
          <View style={[styles.progressFill, { width: `${(done / Math.max(1, stop.items.length)) * 100}%` }]} />
        </View>

        {focus ? (
          <FocusCard
            key={focus.id}
            item={focus}
            currency={trip.currency}
            onDone={(cents) =>
              actions.record(focus.id, {
                isPurchased: true,
                actualUnitPriceCents: cents,
                purchasedAt: new Date().toISOString(),
              })
            }
          />
        ) : (
          <View style={styles.allDone}>
            <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
            <Text variant="bodyStrong">Todo listo en esta parada.</Text>
          </View>
        )}

        <View style={styles.rows}>
          {stop.items.map((item, index) => (
            <Row
              key={item.id}
              item={item}
              currency={trip.currency}
              focused={item.id === focus?.id}
              waiting={waiting.has(item.id)}
              last={index === stop.items.length - 1}
              onToggle={() => toggle(item)}
              onFocus={() => setFocusId(item.id)}
            />
          ))}
        </View>

        <StopFooter
          stop={stop}
          currency={trip.currency}
          first={stopIndex === 0}
          last={last}
          onPrevious={() => goTo(stopIndex - 1)}
          onNext={() => (last ? setFinishing(true) : goTo(stopIndex + 1))}
        />
      </ScrollView>

      <OptionsSheet
        trip={trip}
        visible={options}
        onClose={() => setOptions(false)}
        onFinish={() => {
          setOptions(false);
          setFinishing(true);
        }}
        actions={actions}
      />
      <FinishSheet
        trip={trip}
        visible={finishing}
        onClose={() => setFinishing(false)}
        onCompleted={onCompleted}
        actions={actions}
      />
    </SafeAreaView>
  );
}

/** The next line to pick up: what it should cost, and what it did. */
function FocusCard({
  item,
  currency,
  onDone,
}: {
  item: TripItem;
  currency: string;
  onDone: (cents: number | null) => void;
}) {
  const [text, setText] = useState(item.expectedUnitPriceCents ? priceInput(item.expectedUnitPriceCents) : '');
  const cents = parsePrice(text);
  const invalid = text.trim() !== '' && cents === null;
  const symbol = currency === 'EUR' ? '€' : currency === 'ARS' ? '$' : currency;

  return (
    <View style={styles.focus}>
      <View style={styles.focusText}>
        <Text variant="bodyStrong" style={styles.focusName}>
          {item.product.name}
          {item.quantity !== 1 ? ` × ${item.quantity}` : ''}
        </Text>
        <Text variant="caption" tone="muted">
          {item.expectedUnitPriceCents
            ? `Esperado ${formatPrice(item.expectedUnitPriceCents, currency)} c/u`
            : 'Sin precio esperado'}
        </Text>
      </View>
      <View style={styles.focusRow}>
        <View style={[styles.priceField, invalid && styles.priceFieldInvalid]}>
          <Text tone="muted" style={styles.symbol}>
            {symbol}
          </Text>
          <TextInput
            value={text}
            onChangeText={setText}
            accessibilityLabel="Precio pagado por unidad"
            placeholder="Precio"
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            returnKeyType="done"
            onSubmitEditing={() => !invalid && onDone(cents)}
            style={styles.priceInput}
          />
        </View>
        <Button
          label="Listo"
          disabled={invalid}
          onPress={() => onDone(cents)}
          style={styles.doneButton}
        />
      </View>
      <Text variant="caption" tone={invalid ? 'danger' : 'muted'}>
        {invalid
          ? 'Ese precio no se entiende. Probá con 1.150 o 1,15.'
          : 'Anotá el precio de la góndola: ayuda a que otros paguen menos.'}
      </Text>
    </View>
  );
}

function Row({
  item,
  currency,
  focused,
  waiting,
  last,
  onToggle,
  onFocus,
}: {
  item: TripItem;
  currency: string;
  focused: boolean;
  /** Changed here, not yet on the server. */
  waiting: boolean;
  last: boolean;
  onToggle: () => void;
  onFocus: () => void;
}) {
  const name = `${item.product.name}${item.quantity !== 1 ? ` × ${item.quantity}` : ''}`;
  const note = item.isPurchased
    ? item.actualUnitPriceCents !== null
      ? `Pagado ${formatPrice(item.actualUnitPriceCents, currency)} c/u`
      : 'Comprado, sin precio'
    : item.expectedUnitPriceCents
      ? `Esperado ${formatPrice(item.expectedUnitPriceCents, currency)} c/u`
      : 'Sin precio esperado';
  const total = item.isPurchased ? (item.actualLineTotalCents ?? item.expectedLineTotalCents) : null;
  const waitingNote = waiting ? ' · por enviar' : '';

  return (
    <View style={[styles.row, !last && styles.divider, focused && styles.rowFocused]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.isPurchased }}
        accessibilityLabel={item.isPurchased ? `Desmarcar ${item.product.name}` : `Marcar ${item.product.name}`}
        onPress={onToggle}
        style={styles.check}>
        {item.isPurchased ? (
          <View style={styles.checked}>
            <Ionicons name="checkmark" size={16} color={colors.onAccent} />
          </View>
        ) : (
          <View style={styles.unchecked} />
        )}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${name}. ${note}${waitingNote}`}
        disabled={item.isPurchased}
        onPress={onFocus}
        style={styles.rowText}>
        <Text style={[styles.rowName, item.isPurchased && styles.rowNameDone]}>{name}</Text>
        <Text variant="caption" tone={waiting ? 'signal' : 'muted'}>
          {note}
          {waitingNote}
        </Text>
      </Pressable>
      {total !== null ? <Text style={styles.rowPrice}>{formatPrice(total, currency)}</Text> : null}
    </View>
  );
}

function StopFooter({
  stop,
  currency,
  first,
  last,
  onPrevious,
  onNext,
}: {
  stop: Stop;
  currency: string;
  first: boolean;
  last: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <View style={styles.footer}>
      <View style={styles.spent}>
        <Text variant="caption" tone="muted">
          Gastado en esta parada
        </Text>
        <Text style={styles.spentValue}>{formatPrice(spentAt(stop), currency)}</Text>
      </View>
      <View style={styles.footerButtons}>
        {first ? null : (
          <Button label="Anterior" variant="secondary" onPress={onPrevious} style={styles.footerButton} />
        )}
        <Button
          label={last ? 'Terminar la compra' : 'Siguiente parada'}
          onPress={onNext}
          style={styles.footerButton}
        />
      </View>
    </View>
  );
}

type Actions = ReturnType<typeof useTripActions>;

function OptionsSheet({
  trip,
  visible,
  onClose,
  onFinish,
  actions,
}: {
  trip: Trip;
  visible: boolean;
  onClose: () => void;
  onFinish: () => void;
  actions: Actions;
}) {
  const [abandoning, setAbandoning] = useState(false);

  const close = () => {
    setAbandoning(false);
    onClose();
  };

  const run = (action: 'pause' | 'resume' | 'abandon') => {
    actions.status(action);
    close();
  };

  return (
    <Sheet title={trip.listName} subtitle="Compra en curso" visible={visible} onClose={close}>
      {abandoning ? (
        <View style={styles.sheetActions}>
          <Text>
            ¿Abandonar la compra? Lo que marcaste no se guarda como compra ni se comparte. Tu lista
            queda como está.
          </Text>
          <Button label="Sí, abandonar" onPress={() => run('abandon')} style={styles.danger} />
          <Button label="Cancelar" variant="secondary" onPress={() => setAbandoning(false)} />
        </View>
      ) : (
        <View style={styles.sheetActions}>
          <Button label="Terminar la compra" onPress={onFinish} />
          {trip.status === 'PAUSED' ? (
            <Button label="Seguir la compra" variant="secondary" onPress={() => run('resume')} />
          ) : (
            <Button label="Pausar" variant="secondary" onPress={() => run('pause')} />
          )}
          <Button label="Abandonar" variant="secondary" onPress={() => setAbandoning(true)} />
        </View>
      )}
    </Sheet>
  );
}

function FinishSheet({
  trip,
  visible,
  onClose,
  onCompleted,
  actions,
}: {
  trip: Trip;
  visible: boolean;
  onClose: () => void;
  onCompleted: (trip: Trip) => void;
  actions: Actions;
}) {
  const { itemCount, purchasedItemCount } = trip.totals;
  const left = itemCount - purchasedItemCount;

  const finish = () => {
    // Done on the phone at once; the server hears of it when it can.
    const completed = actions.status('complete');
    onClose();
    onCompleted(completed);
  };

  return (
    <Sheet title="Terminar la compra" visible={visible} onClose={onClose}>
      <Text>
        {left === 0
          ? `Compraste los ${itemCount} productos.`
          : `Compraste ${purchasedItemCount} de ${itemCount} productos. Tu lista no cambia: lo que falta sigue ahí para la próxima.`}
      </Text>
      <Button label="Terminar" onPress={finish} />
      <Button label="Seguir comprando" variant="secondary" onPress={onClose} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  content: { padding: space.xl, gap: space.lg },
  paused: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    paddingLeft: space.lg,
    borderRadius: radii.md,
    backgroundColor: colors.signalSoft,
  },
  pausedText: { flex: 1, fontFamily: fonts.bodyBold, color: colors.signal },
  pausedButton: { minHeight: MIN_TOUCH },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md },
  headerText: { flex: 1, gap: 3 },
  overline: { fontFamily: fonts.bodySemi, fontSize: 13, letterSpacing: 0.4, textTransform: 'uppercase' },
  title: { fontSize: 26, lineHeight: 29 },
  count: { fontFamily: fonts.bodyBold, fontSize: 14, fontVariant: ['tabular-nums'], paddingBottom: 4 },
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
  progress: { height: 8, borderRadius: 4, backgroundColor: colors.line, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: colors.accent },
  focus: {
    gap: space.md,
    padding: space.lg,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: radii.lg,
  },
  focusText: { gap: 2 },
  focusName: { fontSize: 16 },
  focusRow: { flexDirection: 'row', gap: space.sm + 2 },
  priceField: {
    flex: 1,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  priceFieldInvalid: { borderColor: colors.danger },
  symbol: { fontFamily: fonts.bodyBold, fontSize: 18 },
  priceInput: { flex: 1, minWidth: 0, height: '100%', fontFamily: fonts.bodyBold, fontSize: 20, color: colors.ink },
  doneButton: { minHeight: 52, borderRadius: 12 },
  allDone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.lg,
    backgroundColor: colors.accentSoft,
    borderRadius: radii.lg,
  },
  rows: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radii.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 56, paddingRight: space.lg },
  rowFocused: { backgroundColor: colors.accentSoft },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.surfaceMuted },
  check: { width: MIN_TOUCH + 8, height: MIN_TOUCH + 8, alignItems: 'center', justifyContent: 'center' },
  checked: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  unchecked: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#9AA79E' },
  rowText: { flex: 1, gap: 2, paddingVertical: space.sm },
  rowName: { fontFamily: fonts.bodyMedium, fontSize: 15 },
  rowNameDone: { color: colors.muted },
  rowPrice: { fontFamily: fonts.bodyBold, fontSize: 15, fontVariant: ['tabular-nums'] },
  footer: {
    gap: space.md,
    padding: space.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
  },
  spent: { gap: 2 },
  spentValue: { fontFamily: fonts.display, fontSize: 22, fontVariant: ['tabular-nums'] },
  footerButtons: { flexDirection: 'row', gap: space.sm },
  footerButton: { flex: 1 },
  sheetActions: { gap: space.md },
  danger: { backgroundColor: colors.danger },
});
