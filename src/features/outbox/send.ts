import type { Api } from '@/api/client';
import { discardPhoto, photoStillThere } from '@/features/contributions/photo-store';
import { photoFormData } from '@/features/contributions/photo';

import type { Change, ReportChange, SendResult } from './changes';

/** Answers worth another try later: the server is busy, limiting us, or we were not let in yet. */
const worthRetrying = (status: number) =>
  status === 401 || status === 408 || status === 429 || status >= 500;

/** Sends one change. Never throws: what went wrong is the answer. */
export async function send(api: Api, change: Change): Promise<SendResult> {
  try {
    if (change.kind === 'report') {
      return await sendReport(api, change);
    }

    const path = { params: { path: { id: change.tripId } } };
    const answer =
      change.kind === 'item'
        ? await api.PATCH('/v1/shopping-sessions/{id}/items/{itemId}', {
            params: { path: { id: change.tripId, itemId: change.itemId } },
            body: change.progress,
          })
        : change.action === 'pause'
          ? await api.POST('/v1/shopping-sessions/{id}/pause', path)
          : change.action === 'resume'
            ? await api.POST('/v1/shopping-sessions/{id}/resume', path)
            : change.action === 'complete'
              ? await api.POST('/v1/shopping-sessions/{id}/complete', path)
              : await api.POST('/v1/shopping-sessions/{id}/abandon', path);

    const { response, data } = answer;
    if (response.ok) {
      return { result: 'ok', trip: data };
    }
    // The server answered. A busy or limiting one is worth another try; one
    // that refuses (the trip is over, the line is gone) never will accept.
    return worthRetrying(response.status) ? { result: 'retry' } : { result: 'drop' };
  } catch {
    return { result: 'retry', unreachable: true };
  }
}

/**
 * A price from a shelf: the photo first, if there is one, then the report
 * that points at it. A photo the server will not take (too big, not an
 * image) or that is gone from the phone does not hold the price back — the
 * price goes without it. A photo that is up but whose report has to wait is
 * remembered, so it is not uploaded twice.
 */
async function sendReport(api: Api, change: ReportChange): Promise<SendResult> {
  let photoKey = change.photoKey;

  if (change.photoUri && !photoKey && photoStillThere(change.photoUri)) {
    const form = await photoFormData(change.photoUri);
    const upload = await api.POST('/v1/price-evidence', { body: { photo: '' }, bodySerializer: () => form });

    if (upload.response.ok && upload.data) {
      photoKey = upload.data.photoKey;
    } else if (worthRetrying(upload.response.status)) {
      return { result: 'retry' };
    }
  }

  const { response } = await api.POST('/v1/price-observations', {
    body: {
      id: change.id,
      productId: change.productId,
      storeId: change.storeId,
      priceCents: change.priceCents,
      currency: change.currency,
      observedAt: change.observedAt,
      ...(photoKey ? { evidence: { photoKey } } : {}),
    },
  });

  if (response.ok) {
    if (change.photoUri) discardPhoto(change.photoUri);
    return { result: 'ok' };
  }
  if (worthRetrying(response.status)) {
    return { result: 'retry', patch: photoKey && !change.photoKey ? { photoKey } : undefined };
  }
  if (change.photoUri) discardPhoto(change.photoUri);
  return { result: 'drop' };
}
