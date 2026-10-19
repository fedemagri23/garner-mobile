import { ApiError } from '@/api/client';

/**
 * What to tell a person when something failed. A network failure gets a
 * plain-language line rather than "TypeError: Network request failed".
 *
 * The API writes its messages in English (MCON-006), so a screen passes its
 * own Spanish wording for the statuses it expects; anything else falls back
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
      return 'Email o contraseña incorrectos.';
    }
    if (error.status === 429) {
      return 'Demasiados intentos. Esperá un momento y probá de nuevo.';
    }
    if (error.status >= 500) {
      return 'Tuvimos un problema. Probá de nuevo en un rato.';
    }
    return error.message;
  }

  return 'No pudimos conectarnos. Revisá tu conexión.';
}
