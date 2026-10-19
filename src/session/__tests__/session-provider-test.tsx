import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import { SessionProvider, useSession } from '../session-provider';

const mockKeychain = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  getItemAsync: async (key: string) => mockKeychain.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => {
    mockKeychain.set(key, value);
  },
  deleteItemAsync: async (key: string) => {
    mockKeychain.delete(key);
  },
}));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const tokenPair = (n: number) => ({
  accessToken: `access-${n}`,
  accessTokenExpiresIn: 900,
  refreshToken: `refresh-${n}`,
});

/** Routes requests to canned answers and records what was asked. */
function mockApi(routes: Record<string, () => Response>) {
  const calls: string[] = [];
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const request = input instanceof Request ? input : new Request(input);
    const key = `${request.method} ${new URL(request.url).pathname}`;
    calls.push(key);
    const route = routes[key];
    return route ? route() : json(404, { message: 'not mocked' });
  }) as typeof fetch;
  return calls;
}

function Probe() {
  const { status, signIn, signOut } = useSession();
  return (
    <>
      <Text>status: {status}</Text>
      <Pressable accessibilityRole="button" onPress={() => signIn('ana@example.com', 'secret').catch(() => undefined)}>
        <Text>sign in</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={signOut}>
        <Text>sign out</Text>
      </Pressable>
    </>
  );
}

const renderSession = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SessionProvider>
        <Probe />
      </SessionProvider>
    </QueryClientProvider>,
  );

beforeEach(() => mockKeychain.clear());

describe('session', () => {
  it('starts signed out with nothing stored', async () => {
    mockApi({});
    await renderSession();

    expect(await screen.findByText('status: signedOut')).toBeOnTheScreen();
  });

  it('restores a stored session at launch by refreshing it', async () => {
    mockKeychain.set('garner.refreshToken', 'refresh-1');
    const calls = mockApi({ 'POST /v1/auth/refresh': () => json(200, tokenPair(2)) });

    await renderSession();

    expect(await screen.findByText('status: signedIn')).toBeOnTheScreen();
    expect(calls).toEqual(['POST /v1/auth/refresh']);
    expect(mockKeychain.get('garner.refreshToken')).toBe('refresh-2');
  });

  it('forgets a stored session the server no longer accepts', async () => {
    mockKeychain.set('garner.refreshToken', 'refresh-revoked');
    mockApi({ 'POST /v1/auth/refresh': () => json(401, { message: 'Invalid refresh token' }) });

    await renderSession();

    expect(await screen.findByText('status: signedOut')).toBeOnTheScreen();
    expect(mockKeychain.has('garner.refreshToken')).toBe(false);
  });

  it('signs in, keeps the refresh token in the keychain, and signs out again', async () => {
    const calls = mockApi({
      'POST /v1/auth/login': () => json(200, tokenPair(1)),
      'POST /v1/auth/logout': () => new Response(null, { status: 204 }),
    });
    const user = userEvent.setup();
    await renderSession();
    await screen.findByText('status: signedOut');

    await user.press(screen.getByRole('button', { name: 'sign in' }));
    expect(await screen.findByText('status: signedIn')).toBeOnTheScreen();
    expect(mockKeychain.get('garner.refreshToken')).toBe('refresh-1');

    await user.press(screen.getByRole('button', { name: 'sign out' }));
    expect(await screen.findByText('status: signedOut')).toBeOnTheScreen();
    expect(mockKeychain.has('garner.refreshToken')).toBe(false);
    expect(calls).toContain('POST /v1/auth/logout');
  });
});
