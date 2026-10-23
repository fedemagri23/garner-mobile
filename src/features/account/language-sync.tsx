import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { unwrap } from '@/api/client';
import { useLanguage } from '@/i18n/language-provider';
import { useSession } from '@/session/session-provider';

import { meQueryKey, useMe } from './use-me';

/**
 * Tells the server which language the app is showing, so what reaches the
 * shopper with the app closed — push, email — is written in it. Sent when
 * the account's stored language differs: after signing in on a phone in
 * another language, or after choosing one. Failing is harmless; it is tried
 * again the next time the app starts.
 */
export function LanguageSync() {
  const { api } = useSession();
  const { language } = useLanguage();
  const me = useMe();
  const queryClient = useQueryClient();
  const stored = me.data?.locale;

  useEffect(() => {
    if (!stored || stored === language) return;
    unwrap(api.PATCH('/v1/users/me', { body: { locale: language } }))
      .then((user) => queryClient.setQueryData(meQueryKey, user))
      .catch(() => undefined);
  }, [api, language, queryClient, stored]);

  return null;
}
