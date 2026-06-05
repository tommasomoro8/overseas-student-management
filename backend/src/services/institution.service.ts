import { AppError } from '../utils/AppError';
import { FOREIGN_KEY_VIOLATION, isPgError, UNIQUE_VIOLATION } from '../utils/pgErrors';
import {
    InstitutionInput,
    createInstitution as createInstitutionRow,
    deleteInstitution as deleteInstitutionRow,
    findInstitutionById,
    listInstitutions as listInstitutionRows,
    updateInstitution as updateInstitutionRow,
} from '../models/institution.model';
import { toPublicInstitution } from '../utils/mobilityMappers';
import { PublicInstitution } from '../types/mobility.types';

const ERASMUS_CONFLICT = "Esiste gia' un'istituzione con questo codice Erasmus";

/** Elenco di tutte le istituzioni. */
export async function listInstitutions(): Promise<PublicInstitution[]> {
    const rows = await listInstitutionRows();
    return rows.map(toPublicInstitution);
}

/** Singola istituzione per id (404 se assente). */
export async function getInstitution(id: number): Promise<PublicInstitution> {
    const row = await findInstitutionById(id);
    if (!row) {
        throw new AppError(404, 'Istituzione non trovata');
    }
    return toPublicInstitution(row);
}

/** Crea una nuova istituzione (solo office). */
export async function createInstitution(input: InstitutionInput): Promise<PublicInstitution> {
    try {
        const row = await createInstitutionRow(input);
        return toPublicInstitution(row);
    } catch (err) {
        if (isPgError(err, UNIQUE_VIOLATION)) {
            throw new AppError(409, ERASMUS_CONFLICT);
        }
        throw err;
    }
}

/** Aggiorna un'istituzione (solo office). */
export async function updateInstitution(
    id: number,
    input: InstitutionInput,
): Promise<PublicInstitution> {
    let row;
    try {
        row = await updateInstitutionRow(id, input);
    } catch (err) {
        if (isPgError(err, UNIQUE_VIOLATION)) {
            throw new AppError(409, ERASMUS_CONFLICT);
        }
        throw err;
    }
    if (!row) {
        throw new AppError(404, 'Istituzione non trovata');
    }
    return toPublicInstitution(row);
}

/** Elimina un'istituzione (solo office). 409 se ancora referenziata da domande. */
export async function deleteInstitution(id: number): Promise<void> {
    let deleted: boolean;
    try {
        deleted = await deleteInstitutionRow(id);
    } catch (err) {
        if (isPgError(err, FOREIGN_KEY_VIOLATION)) {
            throw new AppError(409, 'Istituzione referenziata da domande esistenti');
        }
        throw err;
    }
    if (!deleted) {
        throw new AppError(404, 'Istituzione non trovata');
    }
}
