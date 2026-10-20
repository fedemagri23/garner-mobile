import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { t } from '@/i18n';
import { fonts, MIN_TOUCH, radii, space } from '@/theme/tokens';

import { useOutbox } from './outbox-provider';

const changes = (n: number) => t('shell.sync.changes', { count: n });

/**
 * Where the shopper's changes stand, in plain words: offline and what waits,
 * sending, all sent, or what the server would not take. Nothing when there
 * is nothing to say.
 */
export function SyncBanner() {
  const { online, pending, syncing, justSynced, rejected, dismissRejected } = useOutbox();

  if (rejected.length > 0) {
    const prices = rejected.filter((change) => change.kind === 'report').length;
    const trip = rejected.length - prices;
    const parts = [
      trip > 0 ? t('shell.sync.tripRejected', { changes: changes(trip) }) : null,
      prices > 0 ? t('shell.sync.priceRejected', { prices: t('shell.sync.prices', { count: prices }) }) : null,
    ].filter(Boolean);

    return (
      <Banner tone="warning" icon="alert-circle-outline" role="alert">
        <Text style={styles.text}>{t('shell.sync.failed', { parts: parts.join(t('shell.sync.and')) })}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('shell.sync.understood')}
          onPress={dismissRejected}
          style={styles.dismiss}>
          <Text style={styles.dismissText}>{t('shell.sync.understood')}</Text>
        </Pressable>
      </Banner>
    );
  }

  if (!online) {
    return (
      <Banner tone="offline" icon="cloud-offline-outline">
        <Text style={styles.text}>
          {t('shell.sync.offline')} ·{' '}
          {pending > 0 ? (
            <Text style={styles.bold}>{t('shell.sync.waiting', { count: pending })}</Text>
          ) : (
            t('shell.sync.offlineHint')
          )}
        </Text>
      </Banner>
    );
  }

  if (pending > 0) {
    return (
      <Banner tone="offline" icon="sync-outline">
        <Text style={styles.text}>{t(syncing ? 'shell.sync.sending' : 'shell.sync.toSend', { changes: changes(pending) })}</Text>
      </Banner>
    );
  }

  if (justSynced) {
    return (
      <Banner tone="ok" icon="checkmark-circle-outline">
        <Text style={styles.text}>{t('shell.sync.allSent')}</Text>
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
