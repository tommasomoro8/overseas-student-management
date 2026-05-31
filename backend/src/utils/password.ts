import bcrypt from 'bcryptjs';
import { env } from '../config/env';

/** Calcola l'hash bcrypt di una password in chiaro. */
export function hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, env.BCRYPT_ROUNDS);
}

/** Confronta una password in chiaro con il relativo hash bcrypt. */
export function comparePassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
}
