import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { useMe } from '@/features/account/use-me';
import { errorMessage } from '@/lib/error-message';
import { useSession } from '@/session/session-provider';
import { colors, radii, space } from '@/theme/tokens';

export default function HomeScreen() {
  const me = useMe();
  const { signOut } = useSession();

  return (
    <Screen>
      <View style={styles.greeting}>
        {me.isPending ? (
          <ActivityIndicator color={colors.accent} />
        ) : me.isError ? (
          <Text tone="danger">{errorMessage(me.error)}</Text>
        ) : (
          <Text tone="muted">Hola, {me.data.displayName}</Text>
        )}
        <Text variant="title" accessibilityRole="header">
          ¿Qué compramos hoy?
        </Text>
      </View>

      <View style={styles.card}>
        <Text variant="label" tone="accent">
          Fase 2
        </Text>
        <Text tone="muted">
          Acá van tu lista con el ahorro estimado y los precios que bajaron cerca tuyo.
        </Text>
      </View>

      <Button label="Cerrar sesión" variant="secondary" onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  greeting: { gap: space.xs, paddingTop: space.xl },
  card: {
    padding: space.xl,
    gap: space.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
});
