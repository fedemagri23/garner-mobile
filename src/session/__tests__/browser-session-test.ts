import { COOKIE_SESSION, oneTabAtATime, refreshBody, withCookieSession } from '../browser-session';

describe('withCookieSession', () => {
  const seen = () => {
    const calls: Request[] = [];
    const base = (async (request: Request) => {
      calls.push(request);
      return new Response(null, { status: 204 });
    }) as unknown as typeof fetch;
    return { calls, base };
  };

  it('asks for the cookie on auth calls', async () => {
    const { calls, base } = seen();

    await withCookieSession(base)(new Request('http://api.test/v1/auth/refresh', { method: 'POST' }));

    expect(calls[0]!.headers.get('x-garner-session')).toBe('cookie');
  });

  it('leaves every other call alone', async () => {
    const { calls, base } = seen();

    await withCookieSession(base)(new Request('http://api.test/v1/products'));

    expect(calls[0]!.headers.get('x-garner-session')).toBeNull();
  });
});

it('sends a real token, and nothing when the cookie holds it', () => {
  expect(refreshBody('abc')).toEqual({ refreshToken: 'abc' });
  expect(refreshBody(COOKIE_SESSION)).toEqual({});
});

it('waits its turn when the browser has locks, and just runs when not', async () => {
  const request = jest.fn((_name: string, run: () => Promise<unknown>) => run());

  await expect(oneTabAtATime(async () => 1, { request } as never)).resolves.toBe(1);
  expect(request).toHaveBeenCalledWith('garner.refresh', expect.any(Function));

  await expect(oneTabAtATime(async () => 2)).resolves.toBe(2);
});
