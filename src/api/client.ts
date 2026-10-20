import { t } from '@/i18n';
import createClient from 'openapi-fetch';

import type { ApiErrorBody, paths } from './types';

/** A typed client for every route in the backend's contract. */
export function createApi(baseUrl: string, fetchImpl?: (request: Request) => Promise<Response>) {
  return createClient<paths>({ baseUrl, fetch: fetchImpl });
}

export type Api = ReturnType<typeof createApi>;

/**
 * An error the API answered with. `message` is written to be shown; for a
 * validation failure the server sends one line per problem.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly requestId: string | undefined;
  readonly messages: string[];

  constructor(status: number, body: Partial<ApiErrorBody> | undefined) {
    const messages = Array.isArray(body?.message)
      ? body.message
      : [body?.message ?? t('common.errors.generic')];
    super(messages.join('\n'));
    this.name = 'ApiError';
    this.status = status;
    this.requestId = body?.requestId;
    this.messages = messages;
  }
}

/** The data of a successful call, or an `ApiError` thrown with the server's message. */
export async function unwrap<T>(
  call: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  const { data, error, response } = await call;

  if (!response.ok || data === undefined) {
    throw new ApiError(response.status, error as Partial<ApiErrorBody> | undefined);
  }

  return data;
}

/** For calls answered with 204 No Content: nothing to return, but failures still throw. */
export async function noContent(
  call: Promise<{ error?: unknown; response: Response }>,
): Promise<void> {
  const { error, response } = await call;

  if (!response.ok) {
    throw new ApiError(response.status, error as Partial<ApiErrorBody> | undefined);
  }
}
