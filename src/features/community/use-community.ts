import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';

import { ApiError, noContent, unwrap } from '@/api/client';
import type { components } from '@/api/types';
import { useOutbox } from '@/features/outbox/outbox-provider';
import { useSession } from '@/session/session-provider';

export type Suggestion = components['schemas']['ProductSuggestionResponse'];
export type NewProduct = components['schemas']['CreateProductRequest'];
export type NewStore = components['schemas']['CreateStoreRequest'];
export type Store = components['schemas']['StoreResponse'];
export type MyAdditions = components['schemas']['MyAdditionsResponse'];
export type AddedProduct = components['schemas']['AddedProductResponse'];
export type AddedStore = components['schemas']['AddedStoreResponse'];
export type FlagReason = components['schemas']['FlagRequest']['reason'];
export type Unit = NewProduct['unit'];

export const UNITS: Unit[] = ['GRAM', 'KILOGRAM', 'MILLILITER', 'LITER', 'UNIT'];
export const FLAG_REASONS: FlagReason[] = ['DUPLICATE', 'WRONG_INFO', 'NOT_EXIST', 'INAPPROPRIATE'];

export const myAdditionsKey = ['community-mine'] as const;

/** "Is it one of these?": products already in the catalog with a name like this. */
export function useSuggestions(name: string) {
  const { api } = useSession();
  const text = name.trim();

  return useQuery({
    queryKey: ['product-suggestions', text],
    enabled: text.length >= 2,
    queryFn: () => unwrap(api.GET('/v1/product-suggestions', { params: { query: { name: text, limit: 5 } } })),
    staleTime: 60_000,
  });
}

export function useBrands() {
  const { api } = useSession();
  return useQuery({ queryKey: ['brands'], queryFn: () => unwrap(api.GET('/v1/brands')), staleTime: 10 * 60_000 });
}

/** Every category, top-level ones first: where a new product goes. */
export function useAllCategories() {
  const { api } = useSession();
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => unwrap(api.GET('/v1/categories')),
    staleTime: 10 * 60_000,
  });
}

export function useSupermarkets() {
  const { api } = useSession();
  return useQuery({
    queryKey: ['supermarkets'],
    queryFn: () => unwrap(api.GET('/v1/supermarkets')),
    staleTime: 10 * 60_000,
  });
}

/** What happened to a product the shopper added. */
export type AddProductOutcome =
  | { kind: 'added'; id: string }
  /** No connection: it waits on the phone and goes when it can. */
  | { kind: 'queued'; id: string };

/**
 * Adds a product. With a connection it is sent at once, so a duplicate or
 * the daily limit is answered on the spot (thrown as `ApiError`). Without
 * one it waits on the phone's queue with an id chosen here, which the server
 * keeps, so sending it twice adds it once.
 */
export function useAddProduct() {
  const { api } = useSession();
  const outbox = useOutbox();
  const queryClient = useQueryClient();

  return useMutation({
    // React Query would hold the mutation while offline; this one queues itself instead.
    networkMode: 'always',
    mutationFn: async (input: { product: NewProduct; brandLabel: string | null }): Promise<AddProductOutcome> => {
      const product = { ...input.product, id: randomUUID() };
      const queue = (): AddProductOutcome => {
        outbox.add({ kind: 'product', id: product.id, addedAt: new Date().toISOString(), product, brandLabel: input.brandLabel });
        return { kind: 'queued', id: product.id };
      };

      if (!outbox.online) return queue();
      try {
        const created = await unwrap(api.POST('/v1/products', { body: product }));
        return { kind: 'added', id: created.id };
      } catch (error) {
        // The server answered: tell the shopper. It did not: keep it for later.
        if (error instanceof ApiError && error.status < 500) throw error;
        return queue();
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: myAdditionsKey });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void queryClient.invalidateQueries({ queryKey: ['brands'] });
    },
  });
}

/** Adds a shop: private to the shopper until enough products are priced there. */
export function useAddStore() {
  const { api } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (store: NewStore) => unwrap(api.POST('/v1/stores', { body: store })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: myAdditionsKey });
      void queryClient.invalidateQueries({ queryKey: ['stores-near'] });
      void queryClient.invalidateQueries({ queryKey: ['supermarkets'] });
    },
  });
}

export function useStore(id: string | null) {
  const { api } = useSession();
  return useQuery({
    queryKey: ['store', id],
    enabled: id !== null,
    queryFn: () => unwrap(api.GET('/v1/stores/{id}', { params: { path: { id: id! } } })),
  });
}

type Target = 'product' | 'store';
const sayKey = (target: Target, id: string) => ['viewer-say', target, id];

/** Whether the shopper added, confirmed or reported this entry. */
export function useViewerSay(target: Target, id: string, enabled = true) {
  const { api } = useSession();

  return useQuery({
    queryKey: sayKey(target, id),
    enabled,
    queryFn: () =>
      target === 'product'
        ? unwrap(api.GET('/v1/products/{id}/viewer-say', { params: { path: { id } } }))
        : unwrap(api.GET('/v1/stores/{id}/viewer-say', { params: { path: { id } } })),
  });
}

/** "It exists and it's right", or taking that back. */
export function useConfirmProduct(id: string) {
  const { api } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (confirm: boolean) => {
      const path = { params: { path: { id } } };
      return unwrap(
        confirm
          ? api.POST('/v1/products/{id}/confirmations', path)
          : api.DELETE('/v1/products/{id}/confirmations', path),
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sayKey('product', id) });
      void queryClient.invalidateQueries({ queryKey: ['product', id] });
    },
  });
}

/** Reports a product or shop as wrong, with a reason. */
export function useFlag(target: Target, id: string) {
  const { api } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reason: FlagReason) => {
      const request = { params: { path: { id } }, body: { reason } };
      return noContent(
        target === 'product'
          ? api.POST('/v1/products/{id}/flags', request)
          : api.POST('/v1/stores/{id}/flags', request),
      );
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: sayKey(target, id) }),
  });
}

/** The products and shops the shopper added, with where each stands. */
export function useMyAdditions() {
  const { api } = useSession();
  return useQuery({ queryKey: myAdditionsKey, queryFn: () => unwrap(api.GET('/v1/community/mine')) });
}
