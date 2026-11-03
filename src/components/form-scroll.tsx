import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

/**
 * A long form that keeps the field being typed in above the keyboard. iOS
 * moves it with the scroll view's own insets. Android apps are edge to edge,
 * so the window no longer resizes for the keyboard and the view has to make
 * the room itself. (Expo's keyboard library would do both, but is not in Expo Go.)
 */
export function FormScroll({
  children,
  contentContainerStyle,
}: {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'android' ? 'padding' : undefined}>
      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={contentContainerStyle}
        keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
