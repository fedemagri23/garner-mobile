import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useRef, useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Text } from '@/components/text';
import { t } from '@/i18n';
import { colors, fonts, MIN_TOUCH, radii, space } from '@/theme/tokens';

import { cleanBarcode } from './validate';

/** What a supermarket shelf carries: EAN and UPC, the GS1 retail codes. */
const RETAIL_BARCODES = ['ean13', 'ean8', 'upc_a', 'upc_e'] as const;

/**
 * The scanner, for filling in a form rather than searching: the first code
 * read (or typed) goes back to whoever opened it, and it closes. A modal of
 * its own, so the form underneath keeps everything typed so far.
 */
export function ScanCodeSheet({
  visible,
  onCode,
  onClose,
}: {
  visible: boolean;
  onCode: (code: string) => void;
  onClose: () => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [typed, setTyped] = useState('');
  // The camera reports the same code many times a second: take the first.
  const taken = useRef(false);

  const take = (raw: string) => {
    const code = cleanBarcode(raw);
    if (!code || taken.current) return;
    taken.current = true;
    onCode(code);
    setTyped('');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onShow={() => (taken.current = false)}
      onRequestClose={onClose}>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.viewfinder}>
          {permission?.granted ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: [...RETAIL_BARCODES] }}
              onBarcodeScanned={({ data }: BarcodeScanningResult) => take(data)}
            />
          ) : null}
          <View style={styles.topBar}>
            <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={onClose} style={styles.round}>
              <Ionicons name="close" size={22} color={colors.onAccent} />
            </Pressable>
            <Text tone="onAccent" style={styles.title}>
              {t('community.scanSheet.title')}
            </Text>
            <View style={styles.roundSpacer} />
          </View>
          {permission?.granted ? (
            <View style={styles.frame} accessible={false}>
              <View style={styles.line} />
            </View>
          ) : permission ? (
            <View style={styles.permission}>
              <Text tone="onAccent" style={styles.center}>
                {t('browse.scan.needCamera')}
              </Text>
              <Button
                label={permission.canAskAgain ? t('browse.scan.allowCamera') : t('browse.scan.openSettings')}
                variant="secondary"
                onPress={permission.canAskAgain ? requestPermission : () => Linking.openSettings()}
              />
            </View>
          ) : null}
        </View>
        <View style={styles.sheet}>
          <Text tone="muted">{permission?.granted ? t('community.scanSheet.aim') : t('browse.scan.noCamera')}</Text>
          <View style={styles.typedRow}>
            <TextInput
              value={typed}
              onChangeText={setTyped}
              accessibilityLabel={t('browse.scan.barcode')}
              placeholder={t('browse.scan.barcode')}
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              returnKeyType="done"
              onSubmitEditing={() => take(typed)}
              style={styles.input}
            />
            <Button
              label={t('community.scanSheet.use')}
              disabled={!typed.trim()}
              onPress={() => take(typed)}
              style={styles.use}
            />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#101612' },
  viewfinder: { flex: 1, overflow: 'hidden' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space.xl },
  round: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: MIN_TOUCH / 2,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundSpacer: { width: MIN_TOUCH },
  title: { fontFamily: fonts.bodySemi, fontSize: 15, flex: 1, textAlign: 'center' },
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
  center: { textAlign: 'center' },
  sheet: {
    backgroundColor: colors.ground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: space.xl,
    gap: space.lg,
  },
  typedRow: { flexDirection: 'row', gap: space.sm },
  input: {
    flex: 1,
    minWidth: 0,
    height: 54,
    paddingHorizontal: space.lg,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    fontFamily: fonts.bodyMedium,
    fontSize: 18,
    color: colors.ink,
  },
  use: { paddingHorizontal: space.lg },
});
