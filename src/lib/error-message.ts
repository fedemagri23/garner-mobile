import { ApiError } from '@/api/client';

/**
 * What to tell a person when something failed. The API's own messages are
 * written to be shown; a network failure gets a plain-language line rather
 * than "TypeError: Network request failed".
 */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
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
