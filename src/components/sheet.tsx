import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { useLayout } from '@/lib/use-layout';
import { colors, radii, space } from '@/theme/tokens';

import { Text } from './text';

/**
 * A panel over the screen; tapping outside it closes it. It slides up from
 * the bottom on a phone, and is a centred dialog where there is room.
 */
export function Sheet({
  title,
  subtitle,
  visible,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { isCompact } = useLayout();

  return (
    <Modal visible={visible} transparent animationType={isCompact ? 'slide' : 'fade'} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.fill, !isCompact && styles.centred]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable
          style={isCompact ? styles.backdrop : styles.backdropBehind}
          accessibilityLabel={t('common.close')}
          onPress={onClose}
        />
        <View
          style={
            isCompact
              ? [
                  styles.sheet,
                  {
                    paddingBottom: space.xl + insets.bottom,
                    paddingLeft: space.xl + insets.left,
                    paddingRight: space.xl + insets.right,
                  },
                ]
              : styles.dialog
          }>
          <Text variant="heading" accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const BACKDROP = 'rgba(16,22,18,0.4)';

const styles = StyleSheet.create({
  fill: { flex: 1 },
  centred: { alignItems: 'center', justifyContent: 'center', padding: space.xl },
  backdrop: { flex: 1, backgroundColor: BACKDROP },
  backdropBehind: { ...StyleSheet.absoluteFill, backgroundColor: BACKDROP },
  sheet: {
    backgroundColor: colors.ground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: space.xl,
    gap: space.md,
    maxHeight: '80%',
  },
  dialog: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '85%',
    backgroundColor: colors.ground,
    borderRadius: radii.xl,
    padding: space.xxl,
    gap: space.md,
  },
});
