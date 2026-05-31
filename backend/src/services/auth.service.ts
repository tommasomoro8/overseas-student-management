import { AppError } from '../utils/AppError';
import { comparePassword, hashPassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import {
    createUser,
    findUserByEmail,
    findUserById,
    UNIQUE_VIOLATION,
    UserRow,
} from '../models/user.model';
import { PublicUser, UserRole } from '../types/auth.types';

/** Dati per la registrazione pubblica di uno studente. */
export interface RegisterStudentInput {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    matriculationNumber: string;
}

/** Dati per la creazione di un account staff (docente o ufficio) da parte dell'office. */
export interface CreateStaffInput {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: Extract<UserRole, 'lecturer' | 'office'>; // Estrae dal tipo globale UserRole solo i ruoli consentiti per lo staff.
}

/** Risultato di registrazione/login: utente pubblico + token di accesso. */
export interface AuthResult {
    user: PublicUser;
    token: string;
}

/** Converte una riga del DB nella rappresentazione pubblica (senza hash password). */
function toPublicUser(row: UserRow): PublicUser {
    return {
        id: row.id,
        email: row.email,
        role: row.role,
        firstName: row.first_name,
        lastName: row.last_name,
        matriculationNumber: row.matriculation_number,
        createdAt: row.created_at,
    };
}

/** Crea un access token a partire da un utente pubblico. */
function issueToken(user: PublicUser): string {
    return signToken({ userId: user.id, email: user.email, role: user.role });
}

interface CreateAccountParams {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    matriculationNumber: string | null;
}

/** Logica condivisa di creazione account, con controllo email duplicata. */
async function createAccount(params: CreateAccountParams): Promise<PublicUser> {
    // L'email viene normalizzata (minuscolo + trim) gia' a livello di validazione,
    // qui controlliamo l'unicita' in modo esplicito per un messaggio d'errore chiaro.
    const existing = await findUserByEmail(params.email);
    if (existing) {
        throw new AppError(409, "Email gia' registrata");
    }

    const passwordHash = await hashPassword(params.password);

    try {
        const row = await createUser({
            email: params.email,
            passwordHash,
            role: params.role,
            firstName: params.firstName,
            lastName: params.lastName,
            matriculationNumber: params.matriculationNumber,
        });
        return toPublicUser(row);
    } catch (err: unknown) {
        // Protezione contro la race condition tra il controllo sopra e l'INSERT.
        if (
            typeof err === 'object' &&
            err !== null &&
            'code' in err &&
            (err as { code?: string }).code === UNIQUE_VIOLATION
        ) {
            throw new AppError(409, "Email gia' registrata");
        }
        throw err;
    }
}

/** Registra un nuovo studente e restituisce subito un token (auto-login). */
export async function registerStudent(input: RegisterStudentInput): Promise<AuthResult> {
    const user = await createAccount({
        email: input.email,
        password: input.password,
        firstName: input.firstName,
        lastName: input.lastName,
        role: 'student',
        matriculationNumber: input.matriculationNumber,
    });
    return { user, token: issueToken(user) };
}

/** Crea un account staff (docente o ufficio). Riservato al ruolo office. */
export async function createStaff(input: CreateStaffInput): Promise<PublicUser> {
    return createAccount({
        email: input.email,
        password: input.password,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
        matriculationNumber: null,
    });
}

/** Autentica un utente con email e password, restituendo un token. */
export async function login(email: string, password: string): Promise<AuthResult> {
    const row = await findUserByEmail(email);
    // Eseguiamo comunque il confronto per non rivelare se l'email esiste (timing) —
    // ma se l'utente non esiste rispondiamo con lo stesso messaggio generico.
    if (!row) {
        throw new AppError(401, 'Credenziali non valide');
    }

    const passwordOk = await comparePassword(password, row.password_hash);
    if (!passwordOk) {
        throw new AppError(401, 'Credenziali non valide');
    }

    const user = toPublicUser(row);
    return { user, token: issueToken(user) };
}

/** Restituisce i dati pubblici dell'utente autenticato (GET /me). */
export async function getCurrentUser(userId: number): Promise<PublicUser> {
    const row = await findUserById(userId);
    if (!row) {
        throw new AppError(404, 'Utente non trovato');
    }
    return toPublicUser(row);
}
