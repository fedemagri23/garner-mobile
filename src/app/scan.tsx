import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { Button } from '@/components/button';
import { Text } from '@/components/text';
import { useBarcodeLookup } from '@/features/catalog/use-catalog';
import { t } from '@/i18n';
import { errorMessage } from '@/lib/error-message';
import { colors, fonts, MIN_TOUCH, radii, space } from '@/theme/tokens';

/** What a supermarket shelf carries: EAN and UPC, the GS1 retail codes. */
const RETAIL_BARCODES = ['ean13', 'ean8', 'upc_a', 'upc_e'] as const;

type Outcome = { kind: 'notFound' | 'invalid' | 'error'; code: string; message: string } | null;

/**
 * Point the camera at a product's barcode and land on its prices. A code can
 * also be typed — for a label the camera cannot read, or a computer with no
 * camera.
 */
export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [typed, setTyped] = useState('');
  const [outcome, setOutcome] = useState<Outcome>(null);
  const lookup = useBarcodeLookup();
  // The camera reports the same code many times a second; one lookup at a time.
  const busy = useRef(false);

  const find = async (raw: string) => {
    const code = raw.replace(/[\s-]/g, '');
    if (!code || busy.current) {
      return;
    }
    busy.current = true;
    setOutcome(null);

    try {
      const product = await lookup.mutateAsync(code);
      // Close the scanner, then open the product in Buscar. Replacing the
      // scanner instead would mount a second copy of the tabs on the root
      // stack.
      router.back();
      router.navigate(`/search/product/${product.id}`);
    } catch (error) {
      const status = error instanceof ApiError ? error.status : 0;
      setOutcome(
        status === 404
          ? { kind: 'notFound', code, message: t('browse.scan.notFound') }
          : status === 400
            ? { kind: 'invalid', code, message: t('browse.scan.invalid') }
            : { kind: 'error', code, message: errorMessage(error) },
      );
      busy.current = false;
    }
  };

  const onScanned = ({ data }: BarcodeScanningResult) => {
    // While an answer is on screen, the shopper decides when to scan again.
    if (!outcome) {
      find(data);
    }
  };

  const cameraReady = permission?.granted;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.viewfinder}>
        {cameraReady ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torch}
            barcodeScannerSettings={{ barcodeTypes: [...RETAIL_BARCODES] }}
            onBarcodeScanned={lookup.isPending ? undefined : onScanned}
          />
        ) : null}

        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            onPress={() => router.back()}
            style={styles.round}>
            <Ionicons name="close" size={22} color={colors.onAccent} />
          </Pressable>
          <Text style={styles.title} tone="onAccent">
            {t('browse.scan.title')}
          </Text>
          {cameraReady && Platform.OS !== 'web' ? (
            <Pressable
              accessibilityRole="switch"
              accessibilityLabel={t('browse.scan.torch')}
              accessibilityState={{ checked: torch }}
              onPress={() => setTorch((on) => !on)}
              style={styles.round}>
              <Ionicons name={torch ? 'flash' : 'flash-outline'} size={20} color={colors.onAccent} />
            </Pressable>
          ) : (
            <View style={styles.roundSpacer} />
          )}
        </View>

        {cameraReady ? (
          <View style={styles.frame} accessible={false}>
            <View style={styles.line} />
          </View>
        ) : (
          <CameraPermission
            canAskAgain={permission?.canAskAgain ?? true}
            loading={!permission}
            onAsk={requestPermission}
          />
        )}
      </View>

      <View style={styles.sheet}>
        {outcome ? (
          <View style={styles.outcome} accessibilityLiveRegion="polite">
            <Text variant="bodyStrong">{outcome.message}</Text>
            <Text variant="caption" tone="muted">
              {t('browse.scan.code', { code: outcome.code })}
            </Text>
            {outcome.kind === 'notFound' ? (
              <Button
                label={t('community.entry.addFromScan')}
                onPress={() => {
                  // In place of the scanner, so closing the form goes back to where scanning began.
                  router.replace({ pathname: '/add-product', params: { barcode: outcome.code } });
                }}
              />
            ) : null}
            <Button label={t('browse.scan.again')} variant="secondary" onPress={() => setOutcome(null)} />
          </View>
        ) : (
          <Text tone="muted">
            {cameraReady
              ? t('browse.scan.aim')
              : t('browse.scan.noCamera')}
          </Text>
        )}

        <View style={styles.typedRow}>
          <TextInput
            value={typed}
            onChangeText={setTyped}
            accessibilityLabel={t('browse.scan.barcode')}
            placeholder={t('browse.scan.barcode')}
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            returnKeyType="search"
            onSubmitEditing={() => find(typed)}
            style={styles.input}
          />
          <Button
            label={t('browse.scan.find')}
            loading={lookup.isPending}
            disabled={!typed.trim()}
            onPress={() => find(typed)}
            style={styles.searchButton}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function CameraPermission({
  canAskAgain,
  loading,
  onAsk,
}: {
  canAskAgain: boolean;
  loading: boolean;
  onAsk: () => void;
}) {
  if (loading) {
    return <View style={styles.permission} />;
  }

  return (
    <View style={styles.permission}>
      <Text tone="onAccent" style={styles.permissionText}>
        {t('browse.scan.needCamera')}
      </Text>
      <Button
        label={canAskAgain ? t('browse.scan.allowCamera') : t('browse.scan.openSettings')}
        variant="secondary"
        onPress={canAskAgain ? onAsk : () => Linking.openSettings()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#101612' },
  viewfinder: { flex: 1, overflow: 'hidden' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: space.xl,
  },
  round: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: MIN_TOUCH / 2,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundSpacer: { width: MIN_TOUCH },
  title: { fontFamily: fonts.bodySemi, fontSize: 15 },
  frame: {
    alignSelf: 'center',
    marginTop: space.xxxl,
    width: 260,
    height: 150,
    borderWidth: 3,
    borderColor: colors.onAccent,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: { width: 220, height: 2, backgroundColor: '#7BE0A7' },
  permission: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg, padding: space.xxl },
  permissionText: { textAlign: 'center' },
  sheet: {
    backgroundColor: colors.ground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: space.xl,
    gap: space.lg,
  },
  outcome: { gap: space.sm },
  typedRow: { flexDirection: 'row', gap: space.sm },
  input: {
    flex: 1,
    height: 54,
    paddingHorizontal: space.lg,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    fontFamily: fonts.bodyMedium,
    fontSize: 18,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  searchButton: { paddingHorizontal: space.xl },
});
