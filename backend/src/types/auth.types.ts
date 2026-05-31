/** Ruoli di dominio previsti dalla specifica del progetto Overseas. */
export type UserRole = 'student' | 'lecturer' | 'office';

/** Contenuto del payload firmato dentro il JWT. */
export interface JwtPayload {
    userId: number;
    email: string;
    role: UserRole;
}

/** Utente "leggero" ricostruito dal token e allegato alla richiesta autenticata. */
export interface AuthUser {
    id: number;
    email: string;
    role: UserRole;
}

/** Rappresentazione pubblica dell'utente restituita dalle API (senza password). */
export interface PublicUser {
    id: number;
    email: string;
    role: UserRole;
    firstName: string;
    lastName: string;
    matriculationNumber: string | null;
    createdAt: Date;
}
