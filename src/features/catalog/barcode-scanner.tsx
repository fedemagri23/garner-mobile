import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Text } from '@/components/text';
import { t } from '@/i18n';
import { useLayout } from '@/lib/use-layout';
import { colors, fonts, MIN_TOUCH, pageColumn, radii, space } from '@/theme/tokens';

/** What a supermarket shelf carries: EAN and UPC, the GS1 retail codes. */
const RETAIL_BARCODES = ['ean13', 'ean8', 'upc_a', 'upc_e'] as const;

/** A barcode's proportions, and the frame's share of the screen, within limits. */
const FRAME_ASPECT = 150 / 260;
export const frameWidthFor = (width: number, height: number) =>
  Math.round(Math.min(width * 0.72, (height * 0.3) / FRAME_ASPECT, 420));

/**
 * The camera and a field to type the code in, for a label the camera cannot
 * read or a computer with no camera. The camera stays between the safe areas,
 * clear of the island, a cutout and the home indicator; the keyboard pushes
 * the field up and the camera gives way.
 */
export function BarcodeScanner({
  title,
  aim,
  submitLabel,
  submitting,
  paused,
  onCode,
  onClose,
  outcome,
}: {
  title: string;
  /** What to do, once the camera is on. */
  aim: string;
  submitLabel: string;
  submitting?: boolean;
  /** Stop reading codes, while an answer is on screen. */
  paused?: boolean;
  onCode: (code: string) => void;
  onClose: () => void;
  /** Shown in place of the instruction. */
  outcome?: ReactNode;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [typed, setTyped] = useState('');
  // Allowed, but there is no camera to open: a computer without one.
  const [noCamera, setNoCamera] = useState(false);
  const { width, height } = useLayout();

  const cameraReady = Boolean(permission?.granted) && !noCamera;
  const frameWidth = frameWidthFor(width, height);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.root} behavior="padding">
        <View style={styles.viewfinder}>
          {cameraReady ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              enableTorch={torch}
              barcodeScannerSettings={{ barcodeTypes: [...RETAIL_BARCODES] }}
              onBarcodeScanned={
                paused ? undefined : ({ data }: BarcodeScanningResult) => onCode(data)
              }
              onMountError={() => setNoCamera(true)}
            />
          ) : null}

          <View style={styles.topBar}>
            <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={onClose} style={styles.round}>
              <Ionicons name="close" size={22} color={colors.onAccent} />
            </Pressable>
            <Text style={styles.title} tone="onAccent">
              {title}
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
            <View style={styles.frameArea} pointerEvents="none">
              <View
                style={[styles.frame, { width: frameWidth, height: Math.round(frameWidth * FRAME_ASPECT) }]}
                accessible={false}>
                <View style={[styles.line, { width: frameWidth - 40 }]} />
              </View>
            </View>
          ) : noCamera ? null : permission ? (
            <CameraPermission canAskAgain={permission.canAskAgain} onAsk={requestPermission} />
          ) : null}
        </View>

        <View style={styles.sheet}>
          <View style={styles.sheetContent}>
            {outcome ?? <Text tone="muted">{cameraReady ? aim : t('browse.scan.noCamera')}</Text>}
            <View style={styles.typedRow}>
              <TextInput
                value={typed}
                onChangeText={setTyped}
                accessibilityLabel={t('browse.scan.barcode')}
                placeholder={t('browse.scan.barcode')}
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                returnKeyType="done"
                onSubmitEditing={() => onCode(typed)}
                style={styles.input}
              />
              <Button
                label={submitLabel}
                loading={submitting}
                disabled={!typed.trim()}
                onPress={() => onCode(typed)}
                style={styles.submit}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function CameraPermission({ canAskAgain, onAsk }: { canAskAgain: boolean; onAsk: () => void }) {
  // A browser has no settings page to send anyone to: they allow it in its address bar.
  const canOpenSettings = Platform.OS !== 'web';

  return (
    <View style={styles.permission}>
      <Text tone="onAccent" style={styles.center}>
        {t('browse.scan.needCamera')}
      </Text>
      {canAskAgain || canOpenSettings ? (
        <Button
          label={canAskAgain ? t('browse.scan.allowCamera') : t('browse.scan.openSettings')}
          variant="secondary"
          onPress={canAskAgain ? onAsk : () => Linking.openSettings()}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#101612' },
  viewfinder: { flex: 1, overflow: 'hidden' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, padding: space.xl },
  round: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: MIN_TOUCH / 2,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundSpacer: { width: MIN_TOUCH },
  title: { flex: 1, textAlign: 'center', fontFamily: fonts.bodySemi, fontSize: 15 },
  frameArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: space.xxxl },
  frame: {
    borderWidth: 3,
    borderColor: colors.onAccent,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: { height: 2, backgroundColor: '#7BE0A7' },
  permission: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg, padding: space.xxl },
  center: { textAlign: 'center' },
  sheet: { backgroundColor: colors.ground, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetContent: { ...pageColumn, padding: space.xl, gap: space.lg },
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
    fontVariant: ['tabular-nums'],
  },
  submit: { paddingHorizontal: space.lg },
});
