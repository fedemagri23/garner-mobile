import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { t } from '@/i18n';
import { colors, fonts, radii } from '@/theme/tokens';

type Origin = 'VERIFIED' | 'COMMUNITY';

/**
 * Where a product or shop comes from, said only when it matters: a
 * community entry the team has not checked is marked "Sin verificar"; the
 * team's own are the norm and carry nothing, unless `showVerified` asks for
 * the tick (on a screen about that one entry).
 */
export function OriginBadge({ origin, showVerified = false }: { origin: Origin; showVerified?: boolean }) {
  if (origin === 'COMMUNITY') {
    return (
      <View
        style={[styles.pill, styles.unverified]}
        accessible
        accessibilityLabel={`${t('community.badge.unverified')}. ${t('community.badge.unverifiedHint')}`}>
        <Text style={styles.text} tone="signal">
          {t('community.badge.unverified')}
        </Text>
      </View>
    );
  }
  if (!showVerified) return null;
  return (
    <View style={[styles.pill, styles.verified]} accessible accessibilityLabel={t('community.badge.verified')}>
      <Ionicons name="checkmark-circle" size={13} color={colors.accent} />
      <Text style={styles.text} tone="accent">
        {t('community.badge.verified')}
      </Text>
    </View>
  );
}

/** A shop only its creator can see yet. */
export function PrivateBadge() {
  return (
    <View style={[styles.pill, styles.private]} accessible accessibilityLabel={t('community.progress.title')}>
      <Ionicons name="eye-off-outline" size={12} color={colors.inkSoft} />
      <Text style={[styles.text, styles.privateText]}>{t('community.badge.private')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  unverified: { backgroundColor: colors.signalSoft },
  verified: { backgroundColor: colors.accentSoft },
  private: { backgroundColor: colors.surfaceMuted },
  text: { fontFamily: fonts.bodySemi, fontSize: 12, lineHeight: 16 },
  privateText: { color: colors.inkSoft },
});
