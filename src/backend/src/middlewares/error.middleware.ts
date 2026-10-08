import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';

/** Gestisce le rotte non trovate (deve stare prima dell'error handler). */
export function notFoundHandler(req: Request, res: Response): void {
    res.status(404).json({
        error: `Risorsa non trovata: ${req.method} ${req.originalUrl}`,
    });
}

/**
 * Errori generati da body-parser (express.json): JSON malformato, payload
 * troppo grande, charset non supportato, ecc. Tutti espongono `type` e uno
 * status HTTP. Sono colpa del client, non vanno trattati come errori 500.
 */
function isBodyParserError(
    err: unknown,
): err is { type: string; statusCode?: number; status?: number; message: string } {
    return (
        typeof err === 'object' &&
        err !== null &&
        typeof (err as Record<string, unknown>).type === 'string' &&
        ('statusCode' in err || 'status' in err)
    );
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

    // Errore di parsing del body (es. JSON malformato): è un errore del client.
    // Rispondiamo con lo status originale (tipicamente 400) senza loggare lo stack.
    if (isBodyParserError(err)) {
        const statusCode = err.statusCode ?? err.status ?? 400;
        const message =
            err.type === 'entity.parse.failed'
                ? 'Corpo della richiesta non valido: JSON malformato'
                : err.message;
        res.status(statusCode).json({ error: message });
        return;
    }

    // Errore non previsto: logghiamo lo stack ma non lo esponiamo al client.
    console.error('[error] Errore non gestito:', err);
    res.status(500).json({ error: 'Errore interno del server' });
}
