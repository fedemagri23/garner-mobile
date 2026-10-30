import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { unwrap } from '@/api/client';
import { Button } from '@/components/button';
import { Text } from '@/components/text';
import { t } from '@/i18n';
import { errorMessage } from '@/lib/error-message';
import { openLegal, type LegalDocument } from '@/lib/legal';
import { useSession } from '@/session/session-provider';
import { colors, fonts, MIN_TOUCH, radii, space } from '@/theme/tokens';

import { meQueryKey, useMe } from './use-me';

const DOCUMENTS: { document: LegalDocument; label: () => string }[] = [
  { document: 'terms', label: () => t('shell.legal.terms') },
  { document: 'privacy', label: () => t('shell.legal.privacy') },
  { document: 'credits', label: () => t('shell.legal.credits') },
];

/** Links to the terms, privacy policy and (optionally) credits, opening in the browser. */
export function LegalLinks({ credits = true }: { credits?: boolean }) {
  return (
    <View style={styles.links}>
      {DOCUMENTS.filter((entry) => credits || entry.document !== 'credits').map(({ document, label }) => (
        <Pressable
          key={document}
          accessibilityRole="link"
          onPress={() => void openLegal(document)}
          style={styles.link}>
          <Text variant="label" tone="accent">
            {label()}
          </Text>
          <Ionicons name="open-outline" size={14} color={colors.accent} />
        </Pressable>
      ))}
    </View>
  );
}

/** "Acepto los términos…", a checkbox for the sign-up form. */
export function AcceptTerms({ value, onChange }: { value: boolean; onChange: (accepted: boolean) => void }) {
  return (
    <View style={styles.accept}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: value }}
        accessibilityLabel={t('shell.legal.accept')}
        onPress={() => onChange(!value)}
        style={styles.checkRow}>
        <Ionicons name={value ? 'checkbox' : 'square-outline'} size={24} color={value ? colors.accent : colors.muted} />
        <Text style={styles.checkText}>{t('shell.legal.accept')}</Text>
      </Pressable>
      <LegalLinks credits={false} />
    </View>
  );
}

/**
 * On Inicio, for an account that has not accepted the current terms (one
 * made before there were any, or after they changed): read them, accept.
 */
export function TermsCard() {
  const { api } = useSession();
  const me = useMe();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!me.data || me.data.termsAccepted) return null;

  const accept = async () => {
    setBusy(true);
    setError(null);
    try {
      queryClient.setQueryData(meQueryKey, await unwrap(api.POST('/v1/users/me/terms')));
    } catch (failure) {
      setError(errorMessage(failure));
      setBusy(false);
    }
  };

  return (
    <View style={styles.card} accessibilityRole="summary">
      <Text variant="bodyStrong">{t('shell.legal.terms')}</Text>
      <Text>{t('shell.legal.updatedBody')}</Text>
      <LegalLinks credits={false} />
      {error ? <Text tone="danger">{error}</Text> : null}
      <Button label={t('shell.legal.acceptButton')} loading={busy} onPress={accept} />
    </View>
  );
}

const styles = StyleSheet.create({
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: space.lg },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: MIN_TOUCH },
  accept: { gap: space.xs },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: MIN_TOUCH },
  checkText: { flex: 1, fontFamily: fonts.bodyMedium },
  card: {
    gap: space.md,
    padding: space.lg,
    backgroundColor: colors.signalSoft,
    borderWidth: 1,
    borderColor: colors.signal,
    borderRadius: radii.lg,
  },
});
