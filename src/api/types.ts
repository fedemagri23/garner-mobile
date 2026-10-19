/**
 * The generated contract, re-exported with the few shapes the OpenAPI
 * document does not describe on its own.
 */
export type * from './schema';

/** Every error the API returns has this shape (docs/client-guide.md in the backend). */
export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  requestId?: string;
  timestamp: string;
}
