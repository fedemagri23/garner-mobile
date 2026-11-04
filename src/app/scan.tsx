import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { Button } from '@/components/button';
import { Text } from '@/components/text';
import { BarcodeScanner } from '@/features/catalog/barcode-scanner';
import { useBarcodeLookup } from '@/features/catalog/use-catalog';
import { t } from '@/i18n';
import { errorMessage } from '@/lib/error-message';
import { space } from '@/theme/tokens';

type Outcome = { kind: 'notFound' | 'invalid' | 'error'; code: string; message: string } | null;

/**
 * Point the camera at a product's barcode and land on its prices. A code can
 * also be typed — for a label the camera cannot read, or a computer with no
 * camera.
 */
export default function ScanScreen() {
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

  return (
    <BarcodeScanner
      title={t('browse.scan.title')}
      aim={t('browse.scan.aim')}
      submitLabel={t('browse.scan.find')}
      submitting={lookup.isPending}
      // While an answer is on screen, the shopper decides when to scan again.
      paused={lookup.isPending || outcome !== null}
      onCode={find}
      onClose={() => router.back()}
      outcome={
        outcome ? (
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
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  outcome: { gap: space.sm },
});
