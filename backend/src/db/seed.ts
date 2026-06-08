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
    /** Bandiera opzionale: se omessa viene derivata dal paese in fase di insert. */
    flag?: string;
}

// Alcune istituzioni ospitanti di esempio per popolare il flusso delle domande.
// La bandiera puo' essere indicata esplicitamente; se omessa la deriva countryFlag().
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
    {
        name: 'Technische Universitat Munchen',
        country: 'Germania',
        city: 'Monaco di Baviera',
        erasmusCode: 'D MUNCHEN02',
    },
    {
        name: 'Universiteit van Amsterdam',
        country: 'Paesi Bassi',
        city: 'Amsterdam',
        erasmusCode: 'NL AMSTERD01',
    },
    {
        name: 'Universidade de Lisboa',
        country: 'Portogallo',
        city: 'Lisbona',
        erasmusCode: 'P LISBOA109',
    },
    {
        name: 'KU Leuven',
        country: 'Belgio',
        city: 'Lovanio',
        erasmusCode: 'B LEUVEN01',
    },
    {
        name: 'University of Edinburgh',
        country: 'Regno Unito',
        city: 'Edimburgo',
        erasmusCode: 'UK EDINBUR01',
    },
    {
        name: 'University of Tokyo',
        country: 'Giappone',
        city: 'Tokyo',
        erasmusCode: 'JP TOKYO01',
    },
    {
        name: 'Columbia University',
        country: 'Stati Uniti',
        city: 'New York',
        erasmusCode: 'US NEWYORK07',
    },
    {
        name: 'University of Toronto',
        country: 'Canada',
        city: 'Toronto',
        erasmusCode: 'CA TORONTO01',
    },
    {
        name: 'University of Melbourne',
        country: 'Australia',
        city: 'Melbourne',
        erasmusCode: 'AU MELBOUR01',
    },
    {
        name: 'Tsinghua University',
        country: 'Cina',
        city: 'Pechino',
        erasmusCode: 'CN BEIJING01',
    },
    {
        name: 'National University of Singapore',
        country: 'Singapore',
        city: 'Singapore',
        erasmusCode: 'SG SINGAP01',
    },
    {
        name: 'Universidade de Sao Paulo',
        country: 'Brasile',
        city: 'San Paolo',
        erasmusCode: 'BR SAOPAUL01',
    },
];

// Un utente di test per ciascun ruolo. Stessa password per comodita' in fase d'esame.
const SEED_USERS: SeedUser[] = [
    {
        email: 'studente@unive.it',
        password: 'Ciao1234!',
        role: 'student',
        firstName: 'Tommaso',
        lastName: 'Moro',
        matriculationNumber: '905964',
    },
    {
        email: 'docente@unive.it',
        password: 'Ciao1234!',
        role: 'lecturer',
        firstName: 'Filippo',
        lastName: 'Bergamasco',
        matriculationNumber: null,
    },
    {
        email: 'office@unive.it',
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
            ...(i.flag ? { flag: i.flag } : {}),
        });
        console.log(`[seed] Istituzione di test creata: ${i.name} (${i.erasmusCode})`);
    }
}
