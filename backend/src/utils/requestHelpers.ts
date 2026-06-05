import { Request } from 'express';
import { AppError } from './AppError';
import { AuthUser } from '../types/auth.types';

/** Restituisce l'utente autenticato o lancia 401 (usato dopo il middleware authenticate). */
export function requireUser(req: Request): AuthUser {
    if (!req.user) {
        throw new AppError(401, 'Non autenticato');
    }
    return req.user;
}

/** Converte un parametro di rotta in un id intero positivo, oppure lancia 400. */
export function parseIdParam(value: unknown, label: string): number {
    if (typeof value !== 'string') {
        throw new AppError(400, `${label} non valido`);
    }
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
        throw new AppError(400, `${label} non valido`);
    }
    return id;
}
