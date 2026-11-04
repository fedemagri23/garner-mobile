import { Platform } from 'react-native';

/**
 * How a browser keeps its session. The refresh token is in a cookie the page's
 * scripts cannot read, so this code never sees it: it only remembers that there
 * is one, and asks for it to be used.
 */

/** Stands in for the token in storage and in the refresh call. */
export const COOKIE_SESSION = 'cookie';

const SESSION_HEADER = 'x-garner-session';
/** The cookie's scope on the server. */
const AUTH_PATHS = '/v1/auth/';

/** Sends the cookie on auth calls, and the header that lets the server use it. */
export function withCookieSession(baseFetch: typeof fetch) {
  return async (request: Request): Promise<Response> => {
    if (!new URL(request.url).pathname.startsWith(AUTH_PATHS)) {
      return baseFetch(request);
    }
    const headers = new Headers(request.headers);
    headers.set(SESSION_HEADER, COOKIE_SESSION);
    return baseFetch(new Request(request, { headers, credentials: 'include' }));
  };
}

/** The `fetch` this platform's public and signed clients go through. */
export const sessionFetch = (): ((request: Request) => Promise<Response>) =>
  Platform.OS === 'web'
    ? withCookieSession((...args) => fetch(...args))
    : (request) => fetch(request);

/** What a refresh or sign-out call sends: nothing but the cookie, in a browser. */
export const refreshBody = (token: string): { refreshToken?: string } =>
  token === COOKIE_SESSION ? {} : { refreshToken: token };

type LockManager = { request<T>(name: string, run: () => Promise<T>): Promise<T> };

/**
 * One refresh at a time across a browser's tabs, each of which has its own
 * token manager. Two presenting the same cookie would look like a stolen token.
 * Where the browser has no locks, the server's grace period covers it.
 */
export function oneTabAtATime<T>(run: () => Promise<T>, locks?: LockManager): Promise<T> {
  const manager = locks ?? (globalThis.navigator as { locks?: LockManager } | undefined)?.locks;
  return manager ? manager.request('garner.refresh', run) : run();
}
