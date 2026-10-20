import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-screens/experimental';

import { colors } from '@/theme/tokens';

/**
 * A bar fixed to the bottom of a screen inside the tabs — a total, the
 * screen's actions.
 *
 * On iOS the native tab bar floats over the screen, and only a screen's
 * first scroll view is inset for it automatically; anything fixed at the
 * bottom would sit underneath. This pads the bar by the tab bar's height as
 * the system reports it for this screen (zero on Android, where the tabs
 * already lay the screen out above themselves; a plain view on the web).
 */
export function BottomBar({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <SafeAreaView edges={{ bottom: true }} style={styles.bar}>
      <View style={style}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line },
});
