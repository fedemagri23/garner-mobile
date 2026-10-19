import type { TokenManager } from '@/session/token-manager';

/** Routes that issue or spend tokens themselves, and must never carry one. */
const UNAUTHENTICATED = ['/v1/auth/login', '/v1/auth/register', '/v1/auth/refresh', '/v1/auth/logout'];

/**
 * A `fetch` that signs requests with the session's access token and, when
 * the server answers 401, refreshes once and retries once. Anything after
 * that is the caller's: a second 401 means the session is gone, and the token
 * manager has already signed out.
 */
export function createAuthFetch(
  tokens: Pick<TokenManager, 'accessToken' | 'refresh'>,
  baseFetch: typeof fetch = fetch,
) {
  return async (request: Request): Promise<Response> => {
    const path = new URL(request.url).pathname;

    if (UNAUTHENTICATED.includes(path)) {
      return baseFetch(request);
    }

    // Kept before the first attempt consumes the body, for the retry.
    const retry = request.clone();

    const first = await baseFetch(withToken(request, await tokens.accessToken()));
    if (first.status !== 401) {
      return first;
    }

    let fresh: string;
    try {
      fresh = await tokens.refresh();
    } catch {
      return first;
    }

    return baseFetch(withToken(retry, fresh));
  };
}

function withToken(request: Request, token: string): Request {
  const headers = new Headers(request.headers);
  headers.set('authorization', `Bearer ${token}`);
  return new Request(request, { headers });
}
