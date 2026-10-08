import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtPayload, UserRole } from '../types/auth.types';

// JWT_EXPIRES_IN e' una stringa (es. "1d"); il tipo di jsonwebtoken e' un template
// literal stretto, quindi facciamo un cast esplicito escludendo undefined.
const signOptions: jwt.SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as unknown as NonNullable<jwt.SignOptions['expiresIn']>,
};

/** Firma un nuovo access token a partire dal payload applicativo. */
export function signToken(payload: JwtPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, signOptions);
}

/**
 * Verifica la firma/scadenza del token e ne valida il contenuto.
 * Lancia un errore se il token non e' valido o il payload e' malformato.
 */
export function verifyToken(token: string): JwtPayload {
    const decoded = jwt.verify(token, env.JWT_SECRET);

    if (
        typeof decoded === 'string' ||
        typeof decoded.userId !== 'number' ||
        typeof decoded.email !== 'string' ||
        typeof decoded.role !== 'string'
    ) {
        throw new Error('Payload del token non valido');
    }

    return {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role as UserRole,
    };
}
