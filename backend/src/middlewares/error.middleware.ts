import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';

/** Gestisce le rotte non trovate (deve stare prima dell'error handler). */
export function notFoundHandler(req: Request, res: Response): void {
    res.status(404).json({
        error: `Risorsa non trovata: ${req.method} ${req.originalUrl}`,
    });
}

/**
 * Middleware centrale di gestione errori (4 parametri: richiesto da Express).
 * Trasforma AppError in risposte coerenti; tutto il resto diventa un 500 generico.
 */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction,): void {
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            error: err.message,
            ...(err.details !== undefined ? { details: err.details } : {}),
        });
        return;
    }

    // Errore non previsto: logghiamo lo stack ma non lo esponiamo al client.
    console.error('[error] Errore non gestito:', err);
    res.status(500).json({ error: 'Errore interno del server' });
}
