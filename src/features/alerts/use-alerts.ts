import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { noContent, unwrap } from '@/api/client';
import type { components } from '@/api/types';
import { useSession } from '@/session/session-provider';

import type { Alert, Notification } from './messages';

export type Preferences = components['schemas']['NotificationPreferencesResponse'];
export type CreateAlert = components['schemas']['CreatePriceAlertRequest'];

const messagesKey = ['notifications'] as const;
const unreadKey = ['notifications', 'unread'] as const;
const alertsKey = ['price-alerts'] as const;
const preferencesKey = ['notification-preferences'] as const;

/** The inbox, newest first, a page at a time. */
export function useMessages() {
  const { api } = useSession();

  return useInfiniteQuery({
    queryKey: [...messagesKey, 'list'],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      unwrap(api.GET('/v1/notifications', { params: { query: { page: pageParam, pageSize: 30 } } })),
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
  });
}

/** How many messages have not been read — for the badge on the tab. */
export function useUnreadCount() {
  const { api } = useSession();

  return useQuery({
    queryKey: unreadKey,
    // One row is enough: the page carries the count of the whole inbox.
    queryFn: () => unwrap(api.GET('/v1/notifications', { params: { query: { page: 1, pageSize: 1, unreadOnly: true } } })),
    select: (page) => page.unreadCount,
    // A message can arrive while the app is open.
    refetchInterval: 60_000,
  });
}

/** Marks a message read at once on screen, and tells the server. Repeating it is harmless. */
export function useMarkRead() {
  const { api } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => unwrap(api.POST('/v1/notifications/{id}/read', { params: { path: { id } } })),
    onMutate: (id) => {
      const now = new Date().toISOString();
      queryClient.setQueriesData<{ pages: { data: Notification[]; unreadCount: number }[]; pageParams: unknown[] }>(
        { queryKey: [...messagesKey, 'list'] },
        (cached) =>
          cached && {
            ...cached,
            pages: cached.pages.map((page) => ({
              ...page,
              unreadCount: Math.max(
                0,
                page.unreadCount - (page.data.some((n) => n.id === id && n.readAt === null) ? 1 : 0),
              ),
              data: page.data.map((n) => (n.id === id && n.readAt === null ? { ...n, readAt: now } : n)),
            })),
          },
      );
    },
    onSettled: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: unreadKey }),
      queryClient.invalidateQueries({ queryKey: [...messagesKey, 'list'] }),
    ]),
  });
}

export function useAlerts() {
  const { api } = useSession();

  return useQuery({
    queryKey: alertsKey,
    queryFn: () => unwrap(api.GET('/v1/price-alerts', { params: { query: { pageSize: 50 } } })),
    select: (page) => page.data as Alert[],
  });
}

export function useCreateAlert() {
  const { api } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateAlert) => unwrap(api.POST('/v1/price-alerts', { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: alertsKey }),
  });
}

export function useToggleAlert() {
  const { api } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isEnabled }: { id: string; isEnabled: boolean }) =>
      unwrap(api.PATCH('/v1/price-alerts/{id}', { params: { path: { id } }, body: { isEnabled } })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: alertsKey }),
  });
}

export function useDeleteAlert() {
  const { api } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => noContent(api.DELETE('/v1/price-alerts/{id}', { params: { path: { id } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: alertsKey }),
  });
}

export function usePreferences() {
  const { api } = useSession();

  return useQuery({
    queryKey: preferencesKey,
    queryFn: () => unwrap(api.GET('/v1/notification-preferences')),
  });
}

export function useSavePreferences() {
  const { api } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (changes: components['schemas']['UpdateNotificationPreferencesRequest']) =>
      unwrap(api.PATCH('/v1/notification-preferences', { body: changes })),
    onSuccess: (saved) => queryClient.setQueryData(preferencesKey, saved),
  });
}
