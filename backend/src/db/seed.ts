import { createUser, findUserByEmail } from '../models/user.model';
import { createInstitution, findInstitutionByErasmusCode } from '../models/institution.model';
import { hashPassword } from '../utils/password';
import { UserRole } from '../types/auth.types';

interface SeedUser {
    email: string;
    password: string;
    role: UserRole;
    firstName: string;
    lastName: string;
    matriculationNumber: string | null;
}

interface SeedInstitution {
    name: string;
    country: string;
    city: string;
    erasmusCode: string;
}

// Alcune istituzioni ospitanti di esempio per popolare il flusso delle domande.
const SEED_INSTITUTIONS: SeedInstitution[] = [
    {
        name: 'Universitat de Barcelona',
        country: 'Spagna',
        city: 'Barcellona',
        erasmusCode: 'E BARCELO01',
    },
    {
        name: 'Universite Paris-Saclay',
        country: 'Francia',
        city: 'Parigi',
        erasmusCode: 'F PARIS481',
    },
];

// Un utente di test per ciascun ruolo. Stessa password per comodita' in fase d'esame.
const SEED_USERS: SeedUser[] = [
    {
        email: 'studente@cafoscari.it',
        password: 'Ciao1234!',
        role: 'student',
        firstName: 'Tommaso',
        lastName: 'Moro',
        matriculationNumber: '905964',
    },
    {
        email: 'docente@cafoscari.it',
        password: 'Ciao1234!',
        role: 'lecturer',
        firstName: 'Filippo',
        lastName: 'Bergamasco',
        matriculationNumber: null,
    },
    {
        email: 'office@cafoscari.it',
        password: 'Ciao1234!',
        role: 'office',
        firstName: 'Giulia',
        lastName: 'Verdi',
        matriculationNumber: null,
    },
];

/**
 * Precarica gli utenti di test richiesti dalla specifica.
 * E' idempotente: salta gli utenti gia' presenti, quindi non duplica nulla ad ogni riavvio.
 */
export async function seedDatabase(): Promise<void> {
    for (const u of SEED_USERS) {
        const existing = await findUserByEmail(u.email);
        if (existing) {
            continue;
        }

        const passwordHash = await hashPassword(u.password);
        await createUser({
            email: u.email,
            passwordHash,
            role: u.role,
            firstName: u.firstName,
            lastName: u.lastName,
            matriculationNumber: u.matriculationNumber,
        });
        console.log(`[seed] Utente di test creato: ${u.email} (${u.role})`);
    }

    await seedInstitutions();
}

/** Precarica alcune istituzioni di esempio. Idempotente: salta quelle gia' presenti. */
async function seedInstitutions(): Promise<void> {
    for (const i of SEED_INSTITUTIONS) {
        const existing = await findInstitutionByErasmusCode(i.erasmusCode);
        if (existing) {
            continue;
        }
        await createInstitution({
            name: i.name,
            country: i.country,
            city: i.city,
            erasmusCode: i.erasmusCode,
        });
        console.log(`[seed] Istituzione di test creata: ${i.name} (${i.erasmusCode})`);
    }
}
