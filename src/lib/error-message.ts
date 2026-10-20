import { ApiError } from '@/api/client';
import { t } from '@/i18n';

/**
 * What to tell a person when something failed. A network failure gets a
 * plain-language line rather than "TypeError: Network request failed".
 *
 * The API writes its messages in English (MCON-006), so a screen passes its
 * own wording for the statuses it expects; anything else falls back
 * to the server's message.
 */
export function errorMessage(
  error: unknown,
  /** Messages for statuses a screen knows the meaning of, e.g. 409 on sign-up. */
  byStatus: Partial<Record<number, string>> = {},
): string {
  if (error instanceof ApiError) {
    const specific = byStatus[error.status];
    if (specific) {
      return specific;
    }
    if (error.status === 401) {
      return t('common.errors.wrongCredentials');
    }
    if (error.status === 429) {
      return t('common.errors.tooManyAttempts');
    }
    if (error.status >= 500) {
      return t('common.errors.serverProblem');
    }
    return error.message;
  }

  return t('common.errors.offline');
}
