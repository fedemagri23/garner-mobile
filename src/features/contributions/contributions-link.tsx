import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { pendingReports } from '@/features/outbox/changes';
import { useOutbox } from '@/features/outbox/outbox-provider';
import { colors, radii, space } from '@/theme/tokens';

import { useMyContributions } from './use-contributions';

/** Inicio's way into "Mis aportes", with how many prices there are. */
export function ContributionsLink() {
  const mine = useMyContributions();
  const { queue } = useOutbox();
  const total = (mine.data?.pages[0]?.meta.totalItems ?? 0) + pendingReports(queue).length;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={total > 0 ? `Mis aportes, ${total}` : 'Mis aportes'}
      onPress={() => router.push('/contributions')}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.text}>
        <Text variant="bodyStrong">Mis aportes</Text>
        <Text variant="caption" tone="muted">
          {total === 0
            ? 'Informá un precio y ayudá a otros a pagar menos.'
            : total === 1
              ? '1 precio informado o de tus compras'
              : `${total} precios informados o de tus compras`}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
  },
  pressed: { backgroundColor: colors.surfaceMuted },
  text: { flex: 1, gap: 2 },
});
