import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../utils/AppError';

/**
 * Valida e normalizza req.body contro uno schema zod.
 * In caso di errore restituisce 400 con il dettaglio dei campi non validi.
 * Se la validazione passa, sostituisce req.body con i dati "puliti" (con i default applicati).
 */
export function validateBody(schema: z.ZodType) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const details = result.error.issues.map((issue) => ({
                field: issue.path.join('.'),
                message: issue.message,
            }));
            return next(new AppError(400, 'Dati di input non validi', details));
        }
        req.body = result.data;
        next();
    };
}

/**
 * Nelle richieste multipart (upload file) i campi testuali arrivano come stringhe.
 * Questo middleware fa il JSON.parse dei campi indicati (se presenti) prima di
 * validateBody, cosi' un campo come "examMappings" puo' essere validato come array.
 * Va inserito DOPO il middleware di upload e PRIMA di validateBody.
 */
export function parseJsonFields(...fields: string[]) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        for (const field of fields) {
            const value = req.body?.[field];
            if (typeof value === 'string' && value.trim() !== '') {
                try {
                    req.body[field] = JSON.parse(value);
                } catch {
                    return next(new AppError(400, `Campo "${field}": JSON non valido`));
                }
            }
        }
        next();
    };
}
