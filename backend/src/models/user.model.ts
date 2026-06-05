import { query } from '../config/db';
import { UserRole } from '../types/auth.types';

/** Riga della tabella "users" cosi' come restituita da PostgreSQL (snake_case). */
export interface UserRow {
    id: number;
    email: string;
    password_hash: string;
    role: UserRole;
    first_name: string;
    last_name: string;
    matriculation_number: string | null;
    created_at: Date;
    updated_at: Date;
}

/** Dati necessari per inserire un nuovo utente (password gia' hashata). */
export interface CreateUserInput {
    email: string;
    passwordHash: string;
    role: UserRole;
    firstName: string;
    lastName: string;
    matriculationNumber?: string | null;
}

/** Codice di errore PostgreSQL per violazione di un vincolo UNIQUE (ri-esportato per comodita'). */
export { UNIQUE_VIOLATION } from '../utils/pgErrors';

/** Cerca un utente per email (usata in login e registrazione). */
export async function findUserByEmail(email: string): Promise<UserRow | undefined> {
    const result = await query<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
}

/** Cerca un utente per id (usata da GET /me e dal middleware). */
export async function findUserById(id: number): Promise<UserRow | undefined> {
    const result = await query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
}

/** Elenca tutti gli utenti (tabella piccola): usata per arricchire le domande con i nomi. */
export async function listUsers(): Promise<UserRow[]> {
    const result = await query<UserRow>('SELECT * FROM users ORDER BY last_name, first_name');
    return result.rows;
}

/** Elenca gli utenti di un dato ruolo (es. i docenti referenti selezionabili). */
export async function listUsersByRole(role: UserRole): Promise<UserRow[]> {
    const result = await query<UserRow>(
        'SELECT * FROM users WHERE role = $1 ORDER BY last_name, first_name',
        [role],
    );
    return result.rows;
}

/** Inserisce un nuovo utente e restituisce la riga creata. */
export async function createUser(input: CreateUserInput): Promise<UserRow> {
    const result = await query<UserRow>(
        `INSERT INTO users (email, password_hash, role, first_name, last_name, matriculation_number)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [
            input.email,
            input.passwordHash,
            input.role,
            input.firstName,
            input.lastName,
            input.matriculationNumber ?? null,
        ],
    );

    const user = result.rows[0];
    if (!user) {
        throw new Error("Inserimento dell'utente non riuscito");
    }
    return user;
}
