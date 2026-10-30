import { keepPreviousData, useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';

import { unwrap } from '@/api/client';
import type { components } from '@/api/types';
import { useSession } from '@/session/session-provider';

export type Product = components['schemas']['ProductResponse'];
export type Category = components['schemas']['CategoryResponse'];

const PAGE_SIZE = 20;

/** Products matching a search and category, a page at a time. */
export function useProductSearch(
  search: string,
  categoryId: string | null,
  labels: Product['labels'] = [],
  enabled = true,
) {
  const { api } = useSession();

  return useInfiniteQuery({
    queryKey: ['products', { search, categoryId, labels }],
    enabled,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      unwrap(
        api.GET('/v1/products', {
          params: {
            query: {
              page: pageParam,
              pageSize: PAGE_SIZE,
              search: search || undefined,
              categoryId: categoryId ?? undefined,
              labels: labels.length > 0 ? labels : undefined,
            },
          },
        }),
      ),
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
    // Keep showing the last results while the next search loads, rather than
    // blanking the list on every keystroke.
    placeholderData: keepPreviousData,
  });
}

export function useProduct(id: string) {
  const { api } = useSession();

  return useQuery({
    queryKey: ['product', id],
    queryFn: () => unwrap(api.GET('/v1/products/{id}', { params: { path: { id } } })),
  });
}

/** The product a barcode identifies; a 404 means it is not in the catalog. */
export function useBarcodeLookup() {
  const { api } = useSession();

  return useMutation({
    mutationFn: (code: string) =>
      unwrap(api.GET('/v1/products/barcode/{code}', { params: { path: { code } } })),
  });
}
