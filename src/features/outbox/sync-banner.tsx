import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { fonts, MIN_TOUCH, radii, space } from '@/theme/tokens';

import { useOutbox } from './outbox-provider';

const changes = (n: number) => (n === 1 ? '1 cambio' : `${n} cambios`);

/**
 * Where the shopper's changes stand, in plain words: offline and what waits,
 * sending, all sent, or what the server would not take. Nothing when there
 * is nothing to say.
 */
export function SyncBanner() {
  const { online, pending, syncing, justSynced, rejected, dismissRejected } = useOutbox();

  if (rejected > 0) {
    return (
      <Banner tone="warning" icon="alert-circle-outline" role="alert">
        <Text style={styles.text}>
          No pudimos enviar {changes(rejected)}: la compra ya no estaba abierta.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Entendido"
          onPress={dismissRejected}
          style={styles.dismiss}>
          <Text style={styles.dismissText}>Entendido</Text>
        </Pressable>
      </Banner>
    );
  }

  if (!online) {
    return (
      <Banner tone="offline" icon="cloud-offline-outline">
        <Text style={styles.text}>
          Sin conexión ·{' '}
          {pending > 0 ? (
            <Text style={styles.bold}>
              {changes(pending)} {pending === 1 ? 'espera' : 'esperan'} para enviarse
            </Text>
          ) : (
            'lo que marques se envía al volver'
          )}
        </Text>
      </Banner>
    );
  }

  if (pending > 0) {
    return (
      <Banner tone="offline" icon="sync-outline">
        <Text style={styles.text}>{syncing ? 'Enviando' : 'Por enviar'} {changes(pending)}…</Text>
      </Banner>
    );
  }

  if (justSynced) {
    return (
      <Banner tone="ok" icon="checkmark-circle-outline">
        <Text style={styles.text}>Todo enviado</Text>
      </Banner>
    );
  }

  return null;
}

function Banner({
  tone,
  icon,
  role = 'summary',
  children,
}: {
  tone: 'offline' | 'ok' | 'warning';
  icon: React.ComponentProps<typeof Ionicons>['name'];
  role?: 'summary' | 'alert';
  children: React.ReactNode;
}) {
  return (
    <View
      accessibilityRole={role}
      accessibilityLiveRegion="polite"
      style={[styles.banner, tone === 'offline' ? styles.offline : tone === 'ok' ? styles.ok : styles.warning]}>
      <Ionicons name={icon} size={18} color={BANNER_TEXT} />
      {children}
    </View>
  );
}

const BANNER_TEXT = '#FFF6E5';

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: MIN_TOUCH,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radii.md,
  },
  offline: { backgroundColor: '#3A3428' },
  ok: { backgroundColor: '#1E6B45' },
  warning: { backgroundColor: '#8A2F18' },
  text: { flex: 1, color: BANNER_TEXT, fontFamily: fonts.body, fontSize: 14 },
  // Nested text does not inherit the banner's colour: say it again.
  bold: { color: BANNER_TEXT, fontFamily: fonts.bodyBold },
  dismiss: { minHeight: MIN_TOUCH, justifyContent: 'center', paddingHorizontal: space.sm },
  dismissText: { color: BANNER_TEXT, fontFamily: fonts.bodyBold, fontSize: 14, textDecorationLine: 'underline' },
});
