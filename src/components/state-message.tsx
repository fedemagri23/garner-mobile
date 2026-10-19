import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors, space } from '@/theme/tokens';

import { Text } from './text';

/** Loading, empty and error states inside a section, all the same size. */
export function StateMessage({
  loading,
  message,
  tone = 'muted',
}: {
  loading?: boolean;
  message?: string;
  tone?: 'muted' | 'danger';
}) {
  return (
    <View style={styles.box}>
      {loading ? <ActivityIndicator color={colors.accent} /> : null}
      {message ? (
        <Text tone={tone} style={styles.text}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { paddingVertical: space.xl, paddingHorizontal: space.lg, alignItems: 'center', gap: space.sm },
  text: { textAlign: 'center' },
});
