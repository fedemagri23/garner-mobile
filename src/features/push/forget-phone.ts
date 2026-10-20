import { noContent } from '@/api/client';
import type { Api } from '@/api/client';

import { loadPushToken, savePushToken } from './storage';

/**
 * Tells the server this phone no longer belongs to the account, on sign-out.
 * Best effort: offline, the server moves the token to whoever registers it
 * next, so the worst case is a stray message until then.
 */
export async function forgetPhone(api: Api): Promise<void> {
  const token = await loadPushToken();
  if (!token) {
    return;
  }
  await noContent(api.DELETE('/v1/devices/{token}', { params: { path: { token } } })).catch(() => undefined);
  await savePushToken(null);
}
