/**
 * Owns the session's tokens and the one rule the API is strict about:
 * refresh tokens rotate, and presenting one that was already used revokes
 * every session of the account. So there is never more than one refresh in
 * flight — callers that need a token while one is running wait for it.
 *
 * Pure: storage and the refresh call are injected, so it is tested without a
 * device or a server.
 */

export interface TokenPair {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
}

export interface RefreshTokenStorage {
  get(): Promise<string | null>;
  set(token: string): Promise<void>;
  clear(): Promise<void>;
}

export interface TokenManagerOptions {
  storage: RefreshTokenStorage;
  /** Exchanges a refresh token for a new pair; throws when the server refuses. */
  refresh: (refreshToken: string) => Promise<TokenPair>;
  /** Called once when the session is lost — refused refresh, or sign-out. */
  onSignedOut?: () => void;
  now?: () => number;
}

/** Refresh this long before the access token would expire. */
export const REFRESH_AHEAD_MS = 60_000;

export class SessionExpiredError extends Error {
  constructor() {
    super('The session has expired; sign in again.');
    this.name = 'SessionExpiredError';
  }
}

export function createTokenManager(options: TokenManagerOptions) {
  const now = options.now ?? Date.now;

  let accessToken: string | null = null;
  let expiresAt = 0;
  let inFlight: Promise<string> | null = null;

  const adopt = async (pair: TokenPair): Promise<string> => {
    accessToken = pair.accessToken;
    expiresAt = now() + pair.accessTokenExpiresIn * 1000;
    await options.storage.set(pair.refreshToken);
    return pair.accessToken;
  };

  const forget = async (): Promise<void> => {
    accessToken = null;
    expiresAt = 0;
    await options.storage.clear();
  };

  /** One refresh at a time; everyone asking meanwhile shares its result. */
  const refresh = (): Promise<string> => {
    inFlight ??= (async () => {
      try {
        const refreshToken = await options.storage.get();
        if (!refreshToken) {
          throw new SessionExpiredError();
        }

        let pair: TokenPair;
        try {
          pair = await options.refresh(refreshToken);
        } catch {
          await forget();
          options.onSignedOut?.();
          throw new SessionExpiredError();
        }

        return await adopt(pair);
      } finally {
        inFlight = null;
      }
    })();

    return inFlight;
  };

  return {
    /** Stores a pair from sign-in or sign-up. */
    signedIn: (pair: TokenPair): Promise<string> => adopt(pair),

    /** Whether a session survives on this device, to restore at launch. */
    hasStoredSession: async (): Promise<boolean> =>
      (await options.storage.get()) !== null,

    /** The refresh token to revoke on sign-out, if there is one. */
    storedRefreshToken: (): Promise<string | null> => options.storage.get(),

    /** A usable access token, refreshing first if it is missing or about to expire. */
    async accessToken(): Promise<string> {
      if (inFlight) {
        return inFlight;
      }
      if (accessToken && now() < expiresAt - REFRESH_AHEAD_MS) {
        return accessToken;
      }
      return refresh();
    },

    /** After a 401: the token was refused, so get a new one. */
    refresh,

    async signOut(): Promise<void> {
      await forget();
      options.onSignedOut?.();
    },
  };
}

export type TokenManager = ReturnType<typeof createTokenManager>;
