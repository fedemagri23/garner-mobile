import { useQuery } from '@tanstack/react-query';

import { unwrap } from '@/api/client';
import { useSession } from '@/session/session-provider';

export const meQueryKey = ['me'] as const;

/** The signed-in account. */
export function useMe() {
  const { api } = useSession();

  return useQuery({
    queryKey: meQueryKey,
    queryFn: () => unwrap(api.GET('/v1/users/me')),
  });
}
