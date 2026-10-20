import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';

import { noContent, unwrap } from '@/api/client';
import type { components } from '@/api/types';
import { useCheapestNearby } from '@/features/prices/use-prices';
import { useSession } from '@/session/session-provider';

export type ListSummary = components['schemas']['ShoppingListSummaryResponse'];
export type ListDetail = components['schemas']['ShoppingListDetailResponse'];
export type ListItem = components['schemas']['ShoppingListItemResponse'];

const listsKey = ['shopping-lists'] as const;
const listKey = (id: string) => ['shopping-list', id] as const;

/** Every change to a list shows in the overview and in the list itself. */
function useRefreshLists() {
  const queryClient = useQueryClient();

  return (listId?: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: listsKey }),
      listId ? queryClient.invalidateQueries({ queryKey: listKey(listId) }) : undefined,
    ]);
}

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

/** One list with its items and totals. */
export function useList(id: string) {
  const { api } = useSession();

  return useQuery({
    queryKey: listKey(id),
    queryFn: () => unwrap(api.GET('/v1/shopping-lists/{id}', { params: { path: { id } } })),
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
 * A new line is expected to cost the cheapest price near the shopper in the
 * list's currency, which is what the list's estimated total adds up. It
 * carries an id made here, so a retried request after a dropped response
 * finds the line it already made instead of adding a second one.
 */
export function useAddToList() {
  const { api } = useSession();
  const refresh = useRefreshLists();
  const cheapestNearby = useCheapestNearby();

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

      const expectedUnitPriceCents = await cheapestNearby(productId, list.currency);
      await unwrap(
        api.POST('/v1/shopping-lists/{id}/items', {
          params: { path: { id: list.id } },
          body: { id: randomUUID(), productId, quantity: 1, expectedUnitPriceCents },
        }),
      );
      return { listName: list.name, quantity: 1 };
    },
    onSettled: (_data, _error, { list }) => refresh(list.id),
  });
}

/** A new, empty list. Its currency is fixed for good, so it is chosen on purpose. */
export function useCreateList() {
  const { api } = useSession();
  const refresh = useRefreshLists();

  return useMutation({
    mutationFn: ({ name, currency }: { name: string; currency: string }) =>
      unwrap(api.POST('/v1/shopping-lists', { body: { id: randomUUID(), name, currency } })),
    onSuccess: () => refresh(),
  });
}

export function useRenameList(id: string) {
  const { api } = useSession();
  const refresh = useRefreshLists();

  return useMutation({
    mutationFn: (name: string) =>
      unwrap(api.PATCH('/v1/shopping-lists/{id}', { params: { path: { id } }, body: { name } })),
    onSettled: () => refresh(id),
  });
}

/** A copy with the same items, named "<name> (copia)" unless told otherwise. */
export function useDuplicateList(id: string) {
  const { api } = useSession();
  const refresh = useRefreshLists();

  return useMutation({
    mutationFn: (name: string) =>
      unwrap(
        api.POST('/v1/shopping-lists/{id}/duplicate', {
          params: { path: { id } },
          body: { id: randomUUID(), name },
        }),
      ),
    onSettled: () => refresh(),
  });
}

export function useDeleteList(id: string) {
  const { api } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => noContent(api.DELETE('/v1/shopping-lists/{id}', { params: { path: { id } } })),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: listKey(id) });
      return queryClient.invalidateQueries({ queryKey: listsKey });
    },
  });
}

/** Sets an item's quantity; zero takes it off the list. */
export function useSetQuantity(listId: string) {
  const { api } = useSession();
  const refresh = useRefreshLists();

  return useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      if (quantity <= 0) {
        return noContent(
          api.DELETE('/v1/shopping-lists/{id}/items/{itemId}', {
            params: { path: { id: listId, itemId } },
          }),
        );
      }

      await unwrap(
        api.PATCH('/v1/shopping-lists/{id}/items/{itemId}', {
          params: { path: { id: listId, itemId } },
          body: { quantity },
        }),
      );
    },
    onSettled: () => refresh(listId),
  });
}
