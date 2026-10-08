import { z } from 'zod';

// Normalizza l'email: rimuove spazi e la porta in minuscolo prima dei controlli.
const email = z
    .string()
    .trim()
    .toLowerCase()
    .email('Email non valida')
    .max(255, 'Email troppo lunga');

// bcrypt considera solo i primi 72 byte: limitiamo a 72 per evitare troncamenti silenziosi.
const password = z
    .string()
    .min(8, 'La password deve avere almeno 8 caratteri')
    .max(72, "La password non puo' superare i 72 caratteri");

const name = (label: string) =>
    z.string().trim().min(1, `${label} obbligatorio`).max(100, `${label} troppo lungo`);

/** POST /api/v1/auth/register — registrazione pubblica di uno studente. */
export const registerSchema = z.object({
    email,
    password,
    firstName: name('Nome'),
    lastName: name('Cognome'),
    matriculationNumber: z
        .string()
        .trim()
        .min(1, 'Matricola obbligatoria')
        .max(20, 'Matricola troppo lunga'),
});

/** POST /api/v1/auth/login — autenticazione con email e password. */
export const loginSchema = z.object({
    email,
    password: z.string().min(1, 'Password obbligatoria'),
});

/** POST /api/v1/auth/staff — creazione account staff (solo office). */
export const createStaffSchema = z.object({
    email,
    password,
    firstName: name('Nome'),
    lastName: name('Cognome'),
    role: z.enum(['lecturer', 'office'], {
        errorMap: () => ({ message: "Il ruolo deve essere 'lecturer' o 'office'" }),
    }),
});
