import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { createAuthFetch } from '@/api/auth-fetch';
import { createApi, unwrap, type Api } from '@/api/client';
import { apiBaseUrl } from '@/config';

import { refreshTokenStorage } from './refresh-token-storage';
import { createTokenManager } from './token-manager';

export type SessionStatus = 'restoring' | 'signedOut' | 'signedIn';

interface SessionValue {
  status: SessionStatus;
  /** Authenticated client: signs requests and refreshes as needed. */
  api: Api;
  signIn(email: string, password: string): Promise<void>;
  signUp(input: { email: string; password: string; displayName: string }): Promise<void>;
  signOut(): Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SessionStatus>('restoring');

  const { api, publicApi, tokens } = useMemo(() => {
    const baseUrl = apiBaseUrl();
    // Auth endpoints go through a client that never attaches a token.
    const publicApi = createApi(baseUrl);
    const tokens = createTokenManager({
      storage: refreshTokenStorage(),
      refresh: (refreshToken) =>
        unwrap(publicApi.POST('/v1/auth/refresh', { body: { refreshToken } })),
      onSignedOut: () => setStatus('signedOut'),
    });
    return { api: createApi(baseUrl, createAuthFetch(tokens)), publicApi, tokens };
  }, []);

  // A stored refresh token means a session to restore: exchange it now, so
  // the first screen opens signed in or not, never in between.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!(await tokens.hasStoredSession())) {
        if (!cancelled) setStatus('signedOut');
        return;
      }
      try {
        await tokens.accessToken();
        if (!cancelled) setStatus('signedIn');
      } catch {
        if (!cancelled) setStatus('signedOut');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tokens]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const pair = await unwrap(publicApi.POST('/v1/auth/login', { body: { email, password } }));
      await tokens.signedIn(pair);
      setStatus('signedIn');
    },
    [publicApi, tokens],
  );

  const signUp = useCallback(
    async (input: { email: string; password: string; displayName: string }) => {
      const pair = await unwrap(publicApi.POST('/v1/auth/register', { body: input }));
      await tokens.signedIn(pair);
      setStatus('signedIn');
    },
    [publicApi, tokens],
  );

  const signOut = useCallback(async () => {
    const refreshToken = await tokens.storedRefreshToken();
    // Revoking is best effort: offline, the device still forgets the session.
    if (refreshToken) {
      await publicApi.POST('/v1/auth/logout', { body: { refreshToken } }).catch(() => undefined);
    }
    await tokens.signOut();
    queryClient.clear();
  }, [publicApi, tokens, queryClient]);

  const value = useMemo(
    () => ({ status, api, signIn, signUp, signOut }),
    [status, api, signIn, signUp, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error('useSession must be used inside a SessionProvider');
  }
  return value;
}
