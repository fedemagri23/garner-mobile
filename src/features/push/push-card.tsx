import { useState } from 'react';
import { Linking, StyleSheet, Switch, View } from 'react-native';

import { Button } from '@/components/button';
import { Text } from '@/components/text';
import { t } from '@/i18n';
import { errorMessage } from '@/lib/error-message';
import { colors, radii, space } from '@/theme/tokens';

import { usePush, useTestPush } from './use-push';

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
          ? t('shell.push.noDevices')
          : delivered > 0
            ? t('shell.push.testSent')
            : t('shell.push.testNotDelivered'),
      );
    } catch (error) {
      setResult(errorMessage(error));
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.option}>
        <View style={styles.text}>
          <Text variant="bodyStrong">{t('shell.push.title')}</Text>
          <Text variant="caption" tone="muted">
            {push.state === 'unsupported'
              ? t('shell.push.unsupported')
              : push.state === 'denied'
                ? t('shell.push.denied')
                : t('shell.push.description')}
          </Text>
        </View>
        <Switch
          value={push.state === 'on'}
          disabled={push.busy || push.state === 'unsupported' || push.state === 'denied'}
          onValueChange={(on) => (on ? push.enable() : push.disable())}
          accessibilityLabel={t('shell.push.title')}
          trackColor={{ true: colors.accent, false: colors.lineStrong }}
        />
      </View>
      {push.state === 'denied' ? (
        <Button label={t('shell.push.openSettings')} onPress={() => Linking.openSettings()} />
      ) : null}
      {push.state === 'on' ? <Button label={t('shell.push.sendTest')} onPress={sendTest} /> : null}
      {result ? <Text variant="caption">{result}</Text> : null}
      {push.problem ? <Text tone="danger">{t(`shell.push.problems.${push.problem}`)}</Text> : null}
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
