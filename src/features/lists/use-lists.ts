import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';

import { unwrap } from '@/api/client';
import type { components } from '@/api/types';
import { useSession } from '@/session/session-provider';

export type ListSummary = components['schemas']['ShoppingListSummaryResponse'];
export type ListDetail = components['schemas']['ShoppingListDetailResponse'];

const listsKey = ['shopping-lists'] as const;
const listKey = (id: string) => ['shopping-list', id] as const;

/** The shopper's lists, most recently changed first. */
export function useLists() {
  const { api } = useSession();

  return useQuery({
    queryKey: listsKey,
    queryFn: () =>
      unwrap(api.GET('/v1/shopping-lists', { params: { query: { pageSize: 50 } } })),
    select: (page) => page.data,
  });
}

/** Each list with its items, to tell whether a product is already on it. */
export function useListDetails(ids: string[]) {
  const { api } = useSession();

  return useQueries({
    queries: ids.map((id) => ({
      queryKey: listKey(id),
      queryFn: () =>
        unwrap(api.GET('/v1/shopping-lists/{id}', { params: { path: { id } } })),
    })),
  });
}

/**
 * Puts one more of a product on a list: a new line the first time, a higher
 * quantity after that, so a list never holds the same product twice.
 *
 * A new line carries an id made here, so a retried request after a dropped
 * response finds the line it already made instead of adding a second one.
 */
export function useAddToList() {
  const { api } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ list, productId }: { list: ListDetail; productId: string }) => {
      const existing = list.items.find((item) => item.product.id === productId);

      if (existing) {
        await unwrap(
          api.PATCH('/v1/shopping-lists/{id}/items/{itemId}', {
            params: { path: { id: list.id, itemId: existing.id } },
            body: { quantity: existing.quantity + 1 },
          }),
        );
        return { listName: list.name, quantity: existing.quantity + 1 };
      }

      await unwrap(
        api.POST('/v1/shopping-lists/{id}/items', {
          params: { path: { id: list.id } },
          body: { id: randomUUID(), productId, quantity: 1 },
        }),
      );
      return { listName: list.name, quantity: 1 };
    },
    onSettled: (_data, _error, { list }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: listsKey }),
        queryClient.invalidateQueries({ queryKey: listKey(list.id) }),
      ]),
  });
}

/** A first list, in the currency of the shop the shopper is standing near. */
export function useCreateList() {
  const { api } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, currency }: { name: string; currency: string }) =>
      unwrap(api.POST('/v1/shopping-lists', { body: { id: randomUUID(), name, currency } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listsKey }),
  });
}
