/**
 * API related types and interfaces
 */

import type {
  Request,
  Response,
  RequestHandler,
  ParamsDictionary,
  Query,
} from 'express-serve-static-core';

export type TypedRequest<TBody, TQuery extends Query = Query> = Request<
  ParamsDictionary,
  never,
  TBody,
  TQuery
>;

export type AuthenticatedTypedRequest<TBody, TQuery extends Query = Query> = TypedRequest<
  TBody,
  TQuery
> & {
  userId: string;
};

/**
 * Wraps a typed controller method so it's compatible with Express's route handler.
 * Use this when middleware (e.g. authMiddleware, validation) narrows the request type.
 */
export function asHandler<T>(handler: (req: T, res: Response) => Promise<void>): RequestHandler {
  return handler as unknown as RequestHandler;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  environment: string;
}

/**
 * Hello endpoint response
 */
export interface HelloResponse {
  message: string;
}
