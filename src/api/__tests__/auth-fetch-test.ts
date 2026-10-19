import { createAuthFetch } from '../auth-fetch';

const BASE = 'http://api.test';

const respond = (status: number) => new Response('{}', { status });

describe('authenticated fetch', () => {
  it('signs requests with the current access token', async () => {
    const seen: Request[] = [];
    const authFetch = createAuthFetch(
      { accessToken: async () => 'access-1', refresh: jest.fn() },
      async (request) => {
        seen.push(request as Request);
        return respond(200);
      },
    );

    await authFetch(new Request(`${BASE}/v1/users/me`));

    expect(seen[0].headers.get('authorization')).toBe('Bearer access-1');
  });

  it('refreshes once and retries once after a 401, body intact', async () => {
    const bodies: string[] = [];
    const statuses = [401, 201];
    const refresh = jest.fn(async () => 'access-2');
    const authFetch = createAuthFetch(
      { accessToken: async () => 'access-1', refresh },
      async (request) => {
        const r = request as Request;
        bodies.push(`${r.headers.get('authorization')} ${await r.text()}`);
        return respond(statuses.shift()!);
      },
    );

    const response = await authFetch(
      new Request(`${BASE}/v1/price-observations`, { method: 'POST', body: '{"priceCents":1390}' }),
    );

    expect(response.status).toBe(201);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(bodies).toEqual([
      'Bearer access-1 {"priceCents":1390}',
      'Bearer access-2 {"priceCents":1390}',
    ]);
  });

  it('gives back the 401 when the session cannot be refreshed', async () => {
    const authFetch = createAuthFetch(
      {
        accessToken: async () => 'access-1',
        refresh: async () => {
          throw new Error('expired');
        },
      },
      async () => respond(401),
    );

    expect((await authFetch(new Request(`${BASE}/v1/users/me`))).status).toBe(401);
  });

  it('never attaches a token to the auth endpoints themselves', async () => {
    const accessToken = jest.fn();
    const authFetch = createAuthFetch({ accessToken, refresh: jest.fn() }, async () => respond(200));

    await authFetch(new Request(`${BASE}/v1/auth/login`, { method: 'POST', body: '{}' }));

    expect(accessToken).not.toHaveBeenCalled();
  });
});
