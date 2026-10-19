import { StyleSheet, View } from 'react-native';

import { colors, radii, space } from '@/theme/tokens';

import { Screen } from './screen';
import { Text } from './text';

/** A tab whose screens arrive in a later phase of the plan. */
export function ComingSoon({ title, phase, description }: { title: string; phase: number; description: string }) {
  return (
    <Screen>
      <Text variant="title" accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.card}>
        <Text variant="label" tone="accent">
          Fase {phase}
        </Text>
        <Text tone="muted">{description}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: space.xl,
    gap: space.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
});
