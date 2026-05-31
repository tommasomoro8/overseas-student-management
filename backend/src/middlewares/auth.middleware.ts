import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';
import { UserRole } from '../types/auth.types';

/**
 * Verifica l'header "Authorization: Bearer <token>".
 * Se valido, allega req.user e prosegue; altrimenti restituisce 401.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return next(new AppError(401, 'Token di autenticazione mancante'));
    }

    const token = header.slice('Bearer '.length).trim();
    try {
        const payload = verifyToken(token);
        req.user = { id: payload.userId, email: payload.email, role: payload.role };
        next();
    } catch {
        next(new AppError(401, 'Token non valido o scaduto'));
    }
}

/**
 * Autorizza l'accesso solo agli utenti con uno dei ruoli indicati.
 * Va usato DOPO "authenticate".
 */
export function authorize(...roles: UserRole[]) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            return next(new AppError(401, 'Non autenticato'));
        }
        if (!roles.includes(req.user.role)) {
            return next(new AppError(403, 'Permessi insufficienti per questa operazione'));
        }
        next();
    };
}
