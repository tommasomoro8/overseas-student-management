import { AuthUser } from './auth.types';

// Estende il tipo Request di Express per poter allegare l'utente autenticato
// dopo la verifica del JWT (middleware "authenticate").
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}

export {};
