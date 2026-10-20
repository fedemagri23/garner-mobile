import { useState } from 'react';
import { Linking, StyleSheet, Switch, View } from 'react-native';

import { Button } from '@/components/button';
import { Text } from '@/components/text';
import { errorMessage } from '@/lib/error-message';
import { colors, radii, space } from '@/theme/tokens';

import { usePush, useTestPush, type PushProblem } from './use-push';

const PROBLEMS: Record<PushProblem, string> = {
  simulator: 'Los avisos al teléfono necesitan un teléfono real, no un simulador.',
  'no-project':
    'Esta versión de la app todavía no está registrada para recibir avisos. Hace falta una versión instalada (no Expo Go).',
  failed: 'No pudimos activarlos. Probá de nuevo en un rato.',
};

/** "Avisos en el teléfono": push, for when the app is closed. */
export function PushCard() {
  const push = usePush();
  const test = useTestPush();
  const [result, setResult] = useState<string | null>(null);

  if (push.state === 'checking') {
    return null;
  }

  const sendTest = async () => {
    setResult(null);
    try {
      const { devices, delivered } = await test();
      setResult(
        devices === 0
          ? 'No hay teléfonos registrados.'
          : delivered > 0
            ? 'Enviado. Debería llegarte en unos segundos.'
            : 'No pudimos entregarlo a este teléfono.',
      );
    } catch (error) {
      setResult(errorMessage(error));
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.option}>
        <View style={styles.text}>
          <Text variant="bodyStrong">Avisos en el teléfono</Text>
          <Text variant="caption" tone="muted">
            {push.state === 'unsupported'
              ? 'No disponible acá: hace falta la app instalada en un teléfono (no Expo Go en Android, ni la web).'
              : push.state === 'denied'
                ? 'Los avisos están bloqueados para Garner en los ajustes del teléfono.'
                : 'Te avisamos cuando baja un precio, aunque la app esté cerrada.'}
          </Text>
        </View>
        <Switch
          value={push.state === 'on'}
          disabled={push.busy || push.state === 'unsupported' || push.state === 'denied'}
          onValueChange={(on) => (on ? push.enable() : push.disable())}
          accessibilityLabel="Avisos en el teléfono"
          trackColor={{ true: colors.accent, false: colors.lineStrong }}
        />
      </View>
      {push.state === 'denied' ? (
        <Button label="Abrir ajustes" onPress={() => Linking.openSettings()} />
      ) : null}
      {push.state === 'on' ? <Button label="Enviar una prueba" onPress={sendTest} /> : null}
      {result ? <Text variant="caption">{result}</Text> : null}
      {push.problem ? <Text tone="danger">{PROBLEMS[push.problem]}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.md,
    padding: space.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
  },
  option: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  text: { flex: 1, gap: 2 },
});
