import type { Api } from '@/api/client';

import { drain, enqueue, isTripChange, pendingProducts, type Change, type ProductChange } from '../changes';
import { send } from '../send';

jest.mock('@/features/contributions/photo-store', () => ({ discardPhoto: jest.fn(), photoStillThere: () => true }));
jest.mock('@/features/contributions/photo', () => ({ photoFormData: jest.fn() }));

const product: ProductChange = {
  kind: 'product',
  id: '7d6c1a52-4f1e-4a8b-9a51-3c2f8e0b9d11',
  addedAt: '2026-10-21T10:00:00.000Z',
  product: {
    id: '7d6c1a52-4f1e-4a8b-9a51-3c2f8e0b9d11',
    name: 'Alfajor de Maicena',
    categoryId: 'c-1',
    unit: 'UNIT',
  },
  brandLabel: null,
};

/** An API that answers every POST with this status (and Retry-After, if given). */
const answering = (status: number, retryAfter?: string) => {
  const POST = jest.fn().mockResolvedValue({
    response: { ok: status < 300, status, headers: { get: (name: string) => (name === 'Retry-After' ? (retryAfter ?? null) : null) } },
    data: status < 300 ? { id: product.id } : undefined,
  });
  return { api: { POST } as unknown as Api, POST };
};

describe('sending a product added offline', () => {
  it('sends it with the id the phone chose, so a second send lands the same product', async () => {
    const { api, POST } = answering(201);

    expect(await send(api, product)).toEqual({ result: 'ok' });
    expect(POST).toHaveBeenCalledWith('/v1/products', { body: product.product });
  });

  it('gives up on a duplicate, which no retry will change', async () => {
    expect(await send(answering(409).api, product)).toEqual({ result: 'drop' });
  });

  it('gives up on the daily limit, but waits out the rate limiter', async () => {
    expect(await send(answering(429).api, product)).toEqual({ result: 'drop' });
    expect(await send(answering(429, '30').api, product)).toEqual({ result: 'retry' });
  });

  it('keeps it for later when the server is down or out of reach', async () => {
    expect(await send(answering(503).api, product)).toEqual({ result: 'retry' });
    const api = { POST: jest.fn().mockRejectedValue(new TypeError('Network request failed')) } as unknown as Api;
    expect(await send(api, product)).toEqual({ result: 'retry', unreachable: true });
  });
});

describe('products on the queue', () => {
  it('are not trip changes, and are listed while they wait', async () => {
    const queue: Change[] = enqueue([], product);

    expect(isTripChange(product)).toBe(false);
    expect(pendingProducts(queue)).toEqual([product]);

    const { remaining, sentKinds } = await drain(queue, async () => ({ result: 'ok' }));
    expect(remaining).toEqual([]);
    expect(sentKinds.has('product')).toBe(true);
  });
});
