import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, space } from '@/theme/tokens';

import { Text } from './text';

/** A panel that slides up over the screen; tapping outside it closes it. */
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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} accessibilityLabel="Cerrar" onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: space.xl + insets.bottom }]}>
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

const styles = StyleSheet.create({
  fill: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(16,22,18,0.4)' },
  sheet: {
    backgroundColor: colors.ground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: space.xl,
    gap: space.md,
    maxHeight: '80%',
  },
});
