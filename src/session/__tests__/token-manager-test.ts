import {
  createTokenManager,
  REFRESH_AHEAD_MS,
  SessionExpiredError,
  SessionUnavailableError,
  type RefreshTokenStorage,
  type TokenPair,
} from '../token-manager';

const memoryStorage = (initial: string | null = null): RefreshTokenStorage & { value: string | null } => {
  const store = {
    value: initial,
    get: async () => store.value,
    set: async (token: string) => {
      store.value = token;
    },
    clear: async () => {
      store.value = null;
    },
  };
  return store;
};

const pair = (n: number): TokenPair => ({
  accessToken: `access-${n}`,
  accessTokenExpiresIn: 900,
  refreshToken: `refresh-${n}`,
});

describe('token manager', () => {
  it('keeps the access token in memory and the refresh token in storage', async () => {
    const storage = memoryStorage();
    const manager = createTokenManager({ storage, refresh: jest.fn() });

    await manager.signedIn(pair(1));

    expect(await manager.accessToken()).toBe('access-1');
    expect(storage.value).toBe('refresh-1');
  });

  it('runs one refresh for many callers at once', async () => {
    // The server treats a reused refresh token as theft and signs the account
    // out everywhere — two parallel refreshes would do exactly that.
    const refresh = jest.fn(async () => pair(2));
    const manager = createTokenManager({ storage: memoryStorage('refresh-1'), refresh });

    const tokens = await Promise.all([
      manager.accessToken(),
      manager.accessToken(),
      manager.refresh(),
    ]);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(tokens).toEqual(['access-2', 'access-2', 'access-2']);
  });

  it('refreshes ahead of expiry rather than waiting for a 401', async () => {
    let clock = 0;
    const refresh = jest.fn(async () => pair(2));
    const manager = createTokenManager({
      storage: memoryStorage(),
      refresh,
      now: () => clock,
    });
    await manager.signedIn(pair(1));

    clock = 900_000 - REFRESH_AHEAD_MS - 1;
    expect(await manager.accessToken()).toBe('access-1');

    clock = 900_000 - REFRESH_AHEAD_MS + 1;
    expect(await manager.accessToken()).toBe('access-2');
    expect(refresh).toHaveBeenCalledWith('refresh-1');
  });

  it('signs out when the server refuses the refresh token', async () => {
    const storage = memoryStorage('refresh-1');
    const onSignedOut = jest.fn();
    const manager = createTokenManager({
      storage,
      refresh: async () => {
        throw new Error('401');
      },
      onSignedOut,
    });

    await expect(manager.accessToken()).rejects.toBeInstanceOf(SessionExpiredError);
    expect(storage.value).toBeNull();
    expect(onSignedOut).toHaveBeenCalledTimes(1);
  });

  it('keeps the session when the refresh fails for lack of a connection', async () => {
    // Offline, a refresh fails like a refusal does. Signing out then would
    // drop a good session — and every change waiting to be sent — for a tunnel.
    const storage = memoryStorage('refresh-1');
    const onSignedOut = jest.fn();
    const manager = createTokenManager({
      storage,
      refresh: async () => {
        throw new TypeError('Network request failed');
      },
      isRefusal: (error) => !(error instanceof TypeError),
      onSignedOut,
    });

    await expect(manager.accessToken()).rejects.toBeInstanceOf(SessionUnavailableError);
    expect(storage.value).toBe('refresh-1');
    expect(onSignedOut).not.toHaveBeenCalled();
  });

  it('refreshes once the connection is back, with the token it kept', async () => {
    let online = false;
    const refresh = jest.fn(async () => {
      if (!online) throw new TypeError('Network request failed');
      return pair(2);
    });
    const manager = createTokenManager({
      storage: memoryStorage('refresh-1'),
      refresh,
      isRefusal: (error) => !(error instanceof TypeError),
    });

    await expect(manager.accessToken()).rejects.toBeInstanceOf(SessionUnavailableError);
    online = true;

    expect(await manager.accessToken()).toBe('access-2');
    expect(refresh).toHaveBeenLastCalledWith('refresh-1');
  });

  it('has nothing to restore without a stored refresh token', async () => {
    const manager = createTokenManager({ storage: memoryStorage(), refresh: jest.fn() });

    expect(await manager.hasStoredSession()).toBe(false);
    await expect(manager.accessToken()).rejects.toBeInstanceOf(SessionExpiredError);
  });

  it('can refresh again after a refresh finishes', async () => {
    const refresh = jest.fn(async (token: string) => pair(Number(token.split('-')[1]) + 1));
    const manager = createTokenManager({ storage: memoryStorage('refresh-1'), refresh });

    expect(await manager.refresh()).toBe('access-2');
    expect(await manager.refresh()).toBe('access-3');
    expect(refresh.mock.calls).toEqual([['refresh-1'], ['refresh-2']]);
  });
});
