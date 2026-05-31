import { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Avvolge un handler asincrono e inoltra eventuali errori a next(),
 * cosi' da non dover ripetere try/catch in ogni controller.
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
}
