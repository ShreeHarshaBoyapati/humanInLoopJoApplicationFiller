import type { Request, Response } from '../types/index.js';

/**
 * Track whether the client disconnected before the response was sent.
 *
 * Node's `req.destroyed` and `res.closed` become true under normal
 * end-of-stream/response conditions, so they are not reliable indicators of
 * a client-side abort. Instead we listen for the request's `close` event and
 * only mark the request as aborted if the response has not started yet.
 */
export function trackClientAbort(req: Request, res: Response): void {
  let aborted = false;

  req.on('close', () => {
    if (!res.headersSent) {
      aborted = true;
    }
  });

  Object.defineProperty(req, 'clientAborted', {
    configurable: true,
    enumerable: true,
    get: () => aborted,
  });
}
