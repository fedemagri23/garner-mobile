import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, space } from '@/theme/tokens';

interface Props {
  children: ReactNode;
  /** Scroll the content; off for screens that manage their own lists. */
  scroll?: boolean;
  edges?: Edge[];
  contentStyle?: ViewStyle;
}

/** The page ground every screen sits on. */
export function Screen({ children, scroll = true, edges = ['top'], contentStyle }: Props) {
  return (
    <SafeAreaView edges={edges} style={styles.root}>
      {scroll ? (
        <ScrollView
          // On iOS the tab bar floats over the screen; this insets the end
          // of the content to clear it (MBUG-011).
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  content: { padding: space.xl, gap: space.xl },
});
