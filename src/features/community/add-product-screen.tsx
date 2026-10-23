import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { SyncBanner } from '@/features/outbox/sync-banner';
import { t } from '@/i18n';
import { categoryName } from '@/lib/category-name';
import { errorMessage } from '@/lib/error-message';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { colors, MIN_TOUCH, radii, space } from '@/theme/tokens';

import { lookupWorthy, prefillFrom, type Edited } from './prefill';
import { ScanCodeSheet } from './scan-code-sheet';
import {
  UNITS,
  useAddProduct,
  useAllCategories,
  useBrands,
  useProductLookup,
  useSuggestions,
  type AddProductOutcome,
  type BarcodeLookup,
  type Suggestion,
  type Unit,
} from './use-community';
import { cleanBarcode, nameProblem, parseSize } from './validate';

/** Brand names compared as people mean them: "tia nene" is "Tía Nené". */
const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/**
 * "Agregar producto", from a search that found nothing or a barcode the
 * catalog does not know. What is already there comes first ("¿Es alguno de
 * estos?"), so the catalog does not fill with copies.
 *
 * Scanning the code is the fast way: a code Garner knows opens that product,
 * and one Open Food Facts knows fills in name, brand, size, category and a
 * photo — never over what the shopper already typed.
 */
export function AddProductScreen() {
  const params = useLocalSearchParams<{ name?: string; barcode?: string }>();
  const [name, setName] = useState(params.name ?? '');
  const [brandText, setBrandText] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [sizeText, setSizeText] = useState('');
  const [unit, setUnit] = useState<Unit>('UNIT');
  const [barcode, setBarcode] = useState(params.barcode ?? '');
  const [touched, setTouched] = useState(false);
  const [outcome, setOutcome] = useState<AddProductOutcome | null>(null);
  const [scanning, setScanning] = useState(false);
  const [usePhoto, setUsePhoto] = useState(true);
  // What the shopper typed by hand, which a lookup must not overwrite; and the
  // code whose answer was already applied, so it is applied once.
  const edited = useRef<Edited>({});
  const applied = useRef<string | null>(null);
  const byHand = <T,>(field: keyof Edited, set: (value: T) => void) => (value: T) => {
    edited.current[field] = true;
    set(value);
  };

  const code = cleanBarcode(barcode);
  const lookup = useProductLookup(code, lookupWorthy(code));
  const found = lookup.data?.match === 'OPEN_FOOD_FACTS' ? lookup.data : null;

  useEffect(() => {
    if (!lookup.data || applied.current === code) return;
    applied.current = code;
    const changes = prefillFrom(lookup.data, edited.current);
    if (changes.name !== undefined) setName(changes.name);
    if (changes.brandText !== undefined) setBrandText(changes.brandText);
    if (changes.sizeText !== undefined) setSizeText(changes.sizeText);
    if (changes.unit !== undefined) setUnit(changes.unit);
    if (changes.categoryId !== undefined) setCategoryId(changes.categoryId);
  }, [lookup.data, code]);

  const suggestions = useSuggestions(useDebouncedValue(name));
  const brands = useBrands();
  const categories = useAllCategories();
  const add = useAddProduct();

  const brandMatches = useMemo(() => {
    const typed = fold(brandText);
    if (!typed) return [];
    return (brands.data ?? []).filter((brand) => fold(brand.name).includes(typed)).slice(0, 6);
  }, [brands.data, brandText]);
  const exactBrand = (brands.data ?? []).find((brand) => fold(brand.name) === fold(brandText));
  const sortedCategories = useMemo(
    () => [...(categories.data ?? [])].sort((a, b) => Number(a.parentId !== null) - Number(b.parentId !== null)),
    [categories.data],
  );

  const size = parseSize(sizeText);
  const problems = {
    name: nameProblem(name),
    brand: brandText.trim() && !exactBrand ? nameProblem(brandText, { max: 80 }) : null,
    category: categoryId ? null : t('community.validation.required'),
    size: sizeText.trim() && size === null ? t('community.validation.size') : null,
  };
  const valid = Object.values(problems).every((problem) => problem === null);
  const show = (problem: string | null) => (touched ? (problem ?? undefined) : undefined);

  const submit = () => {
    setTouched(true);
    if (!valid || !categoryId) return;
    add.mutate(
      {
        product: {
          name: name.trim(),
          categoryId,
          unit,
          ...(size !== null ? { packageSize: size } : {}),
          ...(exactBrand ? { brandId: exactBrand.id } : brandText.trim() ? { brandName: brandText.trim() } : {}),
          ...(code ? { barcodes: [code] } : {}),
          // The server takes the photo from its own lookup of the code, never a link.
          ...(found?.imageUrl && usePhoto ? { photoFromLookup: true } : {}),
        },
        brandLabel: exactBrand?.name ?? (brandText.trim() || null),
      },
      { onSuccess: setOutcome },
    );
  };

  if (outcome) {
    return <Added outcome={outcome} />;
  }

  const serverError = add.error
    ? errorMessage(add.error, {
        409:
          add.error instanceof ApiError && /barcode/i.test(add.error.message)
            ? t('community.addProduct.barcodeTaken')
            : t('community.addProduct.duplicate'),
        429: t('community.addProduct.dailyLimit'),
      })
    : null;

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
            {t('community.addProduct.title')}
          </Text>
          <View style={styles.roundSpacer} />
        </View>
        <SyncBanner />
        <Text tone="muted">{t('community.addProduct.intro')}</Text>

        <View style={styles.group}>
          <View style={styles.barcodeRow}>
            <View style={styles.barcodeField}>
              <TextField
                label={t('community.addProduct.barcode')}
                value={barcode}
                onChangeText={setBarcode}
                keyboardType="number-pad"
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('community.addProduct.scan')}
              onPress={() => setScanning(true)}
              style={({ pressed }) => [styles.scan, pressed && styles.pressed]}>
              <Ionicons name="barcode-outline" size={24} color={colors.onAccent} />
            </Pressable>
          </View>
          <Text variant="caption" tone="muted">
            {t('community.addProduct.barcodeHint')}
          </Text>
          <LookupCard
            lookup={lookup.data}
            looking={lookup.isFetching}
            usePhoto={usePhoto}
            onTogglePhoto={() => setUsePhoto((on) => !on)}
          />
        </View>
        <ScanCodeSheet
          visible={scanning}
          onClose={() => setScanning(false)}
          onCode={(scanned) => {
            setBarcode(scanned);
            setScanning(false);
          }}
        />

        <TextField
          label={t('community.addProduct.name')}
          placeholder={t('community.addProduct.namePlaceholder')}
          value={name}
          onChangeText={byHand('name', setName)}
          autoFocus={!params.name && !params.barcode}
          error={show(problems.name)}
        />

        {suggestions.data && suggestions.data.length > 0 ? (
          <View style={styles.group}>
            <Text variant="label">{t('community.addProduct.suggestionsTitle')}</Text>
            <Text variant="caption" tone="muted">
              {t('community.addProduct.suggestionsHint')}
            </Text>
            <View style={styles.card}>
              {suggestions.data.map((suggestion, index) => (
                <SuggestionRow
                  key={suggestion.id}
                  suggestion={suggestion}
                  last={index === suggestions.data.length - 1}
                />
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.group}>
          <TextField
            label={t('community.addProduct.brand')}
            placeholder={t('community.addProduct.brandPlaceholder')}
            value={brandText}
            onChangeText={byHand('brandText', setBrandText)}
            autoCapitalize="words"
            error={show(problems.brand)}
          />
          {brandMatches.length > 0 && !exactBrand ? (
            <View style={styles.wrap}>
              {brandMatches.map((brand) => (
                <Chip
                  key={brand.id}
                  label={brand.name}
                  selected={false}
                  onPress={() => byHand('brandText', setBrandText)(brand.name)}
                />
              ))}
            </View>
          ) : null}
          {brandText.trim().length >= 2 && !exactBrand ? (
            <Text variant="caption" tone="muted">
              {t('community.addProduct.brandNew', { name: brandText.trim() })}
            </Text>
          ) : null}
        </View>

        <View style={styles.group}>
          <Text variant="label">{t('community.addProduct.category')}</Text>
          <View style={styles.wrap} accessibilityRole="radiogroup">
            {sortedCategories.map((category) => (
              <Chip
                key={category.id}
                label={categoryName(category)}
                selected={category.id === categoryId}
                onPress={() => byHand<string | null>('categoryId', setCategoryId)(category.id)}
              />
            ))}
          </View>
          {show(problems.category) ? (
            <Text variant="caption" tone="danger">
              {problems.category}
            </Text>
          ) : null}
        </View>

        <View style={styles.group}>
          <TextField
            label={t('community.addProduct.size')}
            placeholder={t('community.addProduct.sizePlaceholder')}
            value={sizeText}
            onChangeText={byHand('sizeText', setSizeText)}
            keyboardType="decimal-pad"
            error={show(problems.size)}
          />
          <View style={styles.wrap} accessibilityRole="radiogroup">
            {UNITS.map((option) => (
              <Chip
                key={option}
                label={t(`community.addProduct.units.${option}`)}
                selected={option === unit}
                onPress={() => byHand('unit', setUnit)(option)}
              />
            ))}
          </View>
        </View>

        {serverError ? (
          <Text tone="danger" accessibilityLiveRegion="polite">
            {serverError}
          </Text>
        ) : null}
        <Button label={t('community.addProduct.submit')} loading={add.isPending} onPress={submit} />
      </ScrollView>
    </SafeAreaView>
  );
}

/** What the code turned out to be: ours already, found on Open Food Facts, or being looked up. */
function LookupCard({
  lookup,
  looking,
  usePhoto,
  onTogglePhoto,
}: {
  lookup: BarcodeLookup | undefined;
  looking: boolean;
  usePhoto: boolean;
  onTogglePhoto: () => void;
}) {
  if (looking) {
    return (
      <Text variant="caption" tone="muted" accessibilityLiveRegion="polite">
        {t('community.addProduct.lookingUp')}
      </Text>
    );
  }
  if (lookup?.match === 'CATALOG' && lookup.productId) {
    const productId = lookup.productId;
    return (
      <View style={[styles.lookup, styles.lookupKnown]} accessibilityLiveRegion="polite">
        <Text variant="bodyStrong">{t('community.addProduct.inCatalog', { name: lookup.name })}</Text>
        <Button
          label={t('community.addProduct.open')}
          variant="secondary"
          onPress={() => {
            router.back();
            router.navigate(`/search/product/${productId}`);
          }}
        />
      </View>
    );
  }
  if (lookup?.match === 'OPEN_FOOD_FACTS') {
    return (
      <View style={styles.lookup} accessibilityLiveRegion="polite">
        <View style={styles.lookupRow}>
          {lookup.imageUrl && usePhoto ? (
            <Image source={lookup.imageUrl} style={styles.photo} contentFit="contain" accessibilityIgnoresInvertColors />
          ) : null}
          <Text style={styles.lookupText}>{t('community.addProduct.found')}</Text>
        </View>
        {lookup.imageUrl ? (
          <View style={styles.lookupRow}>
            {usePhoto ? (
              <Text variant="caption" tone="muted" style={styles.lookupText}>
                {t('community.addProduct.photoCredit')}
              </Text>
            ) : (
              <View style={styles.lookupText} />
            )}
            <Pressable accessibilityRole="button" onPress={onTogglePhoto} style={styles.photoToggle}>
              <Text variant="label" tone="accent">
                {usePhoto ? t('community.addProduct.removePhoto') : t('community.addProduct.usePhoto')}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  }
  return null;
}

function SuggestionRow({ suggestion, last }: { suggestion: Suggestion; last: boolean }) {
  const meta = [
    suggestion.brandName,
    suggestion.packageSize !== null ? `${suggestion.packageSize} ${t(`community.addProduct.units.${suggestion.unit as Unit}`)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('community.addProduct.suggestionLabel', { name: [suggestion.name, meta].filter(Boolean).join(', ') })}
      onPress={() => {
        router.back();
        router.navigate(`/search/product/${suggestion.id}`);
      }}
      style={({ pressed }) => [styles.suggestion, !last && styles.divider, pressed && styles.pressed]}>
      <View style={styles.suggestionText}>
        <Text variant="bodyStrong">{suggestion.name}</Text>
        {meta ? (
          <Text variant="caption" tone="muted">
            {meta}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

/** After adding: in the catalog already, or waiting on the phone for a connection. */
function Added({ outcome }: { outcome: AddProductOutcome }) {
  const added = outcome.kind === 'added';

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, styles.done]}>
        <SyncBanner />
        <View style={styles.center}>
          <Ionicons
            name={added ? 'checkmark-circle' : 'cloud-upload-outline'}
            size={56}
            color={added ? colors.accent : colors.signal}
          />
        </View>
        <Text variant="title" accessibilityRole="header" style={styles.centerText}>
          {added ? t('community.addProduct.added') : t('community.addProduct.queued')}
        </Text>
        <Text tone="muted" style={styles.centerText}>
          {added ? t('community.addProduct.addedNote') : t('community.addProduct.queuedNote')}
        </Text>
        {added ? (
          <>
            <Button
              label={t('community.addProduct.reportPrice')}
              onPress={() => router.replace({ pathname: '/report-price', params: { productId: outcome.id } })}
            />
            <Button
              label={t('community.addProduct.open')}
              variant="secondary"
              onPress={() => {
                router.back();
                router.navigate(`/search/product/${outcome.id}`);
              }}
            />
          </>
        ) : (
          <Button label={t('community.addProduct.done')} onPress={() => router.back()} />
        )}
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
  barcodeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  barcodeField: { flex: 1 },
  scan: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lookup: {
    gap: space.sm,
    padding: space.md,
    backgroundColor: colors.accentSoft,
    borderRadius: radii.md,
  },
  lookupKnown: { backgroundColor: colors.signalSoft },
  lookupRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  lookupText: { flex: 1 },
  photo: { width: 64, height: 64, borderRadius: radii.sm, backgroundColor: colors.surface },
  photoToggle: { minHeight: MIN_TOUCH, justifyContent: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radii.lg, overflow: 'hidden' },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, padding: space.md, paddingHorizontal: space.lg },
  suggestionText: { flex: 1, gap: 2 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.surfaceMuted },
  pressed: { backgroundColor: colors.surfaceMuted },
  done: { paddingTop: space.xxxl },
  center: { alignItems: 'center' },
  centerText: { textAlign: 'center' },
});
