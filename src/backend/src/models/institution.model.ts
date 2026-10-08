import { query } from '../config/db';
import { countryFlag } from '../utils/countryFlag';

/** Riga della tabella "institutions" cosi' come restituita da PostgreSQL (snake_case). */
export interface InstitutionRow {
    id: number;
    name: string;
    country: string;
    city: string;
    erasmus_code: string;
    flag: string | null;
    created_at: Date;
    updated_at: Date;
}

/** Dati per creare/aggiornare un'istituzione (camelCase). */
export interface InstitutionInput {
    name: string;
    country: string;
    city: string;
    erasmusCode: string;
    /** Bandiera esplicita (emoji). Se assente o vuota viene derivata dal paese. */
    flag?: string;
}

/**
 * Bandiera da salvare: quella indicata esplicitamente se presente,
 * altrimenti derivata dal paese tramite countryFlag().
 */
function resolveFlag(input: InstitutionInput): string {
    const explicit = input.flag?.trim();
    return explicit ? explicit : countryFlag(input.country);
}

/** Elenco di tutte le istituzioni, ordinate per nome. */
export async function listInstitutions(): Promise<InstitutionRow[]> {
    const result = await query<InstitutionRow>('SELECT * FROM institutions ORDER BY name ASC');
    return result.rows;
}

/** Cerca un'istituzione per id. */
export async function findInstitutionById(id: number): Promise<InstitutionRow | undefined> {
    const result = await query<InstitutionRow>('SELECT * FROM institutions WHERE id = $1', [id]);
    return result.rows[0];
}

/** Cerca un'istituzione per codice Erasmus (usata dal seed per l'idempotenza). */
export async function findInstitutionByErasmusCode(
    erasmusCode: string,
): Promise<InstitutionRow | undefined> {
    const result = await query<InstitutionRow>(
        'SELECT * FROM institutions WHERE erasmus_code = $1',
        [erasmusCode],
    );
    return result.rows[0];
}

/**
 * Inserisce una nuova istituzione e restituisce la riga creata.
 * La bandiera e' quella indicata in input, oppure derivata dal paese se assente.
 */
export async function createInstitution(input: InstitutionInput): Promise<InstitutionRow> {
    const result = await query<InstitutionRow>(
        `INSERT INTO institutions (name, country, city, erasmus_code, flag)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [input.name, input.country, input.city, input.erasmusCode, resolveFlag(input)],
    );
    const institution = result.rows[0];
    if (!institution) {
        throw new Error('Inserimento istituzione non riuscito');
    }
    return institution;
}

/** Aggiorna un'istituzione esistente; restituisce undefined se l'id non esiste. */
export async function updateInstitution(
    id: number,
    input: InstitutionInput,
): Promise<InstitutionRow | undefined> {
    const result = await query<InstitutionRow>(
        `UPDATE institutions
         SET name = $1, country = $2, city = $3, erasmus_code = $4, flag = $5, updated_at = now()
         WHERE id = $6
         RETURNING *`,
        [input.name, input.country, input.city, input.erasmusCode, resolveFlag(input), id],
    );
    return result.rows[0];
}

/**
 * Popola la bandiera delle istituzioni che non ce l'hanno ancora (DB preesistenti),
 * derivandola dal paese. Idempotente: aggiorna solo le righe con flag NULL.
 */
export async function backfillInstitutionFlags(): Promise<void> {
    const result = await query<{ id: number; country: string }>(
        'SELECT id, country FROM institutions WHERE flag IS NULL',
    );
    for (const row of result.rows) {
        await query('UPDATE institutions SET flag = $1 WHERE id = $2', [
            countryFlag(row.country),
            row.id,
        ]);
    }
}

/** Elimina un'istituzione; restituisce true se una riga e' stata cancellata. */
export async function deleteInstitution(id: number): Promise<boolean> {
    const result = await query('DELETE FROM institutions WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
}
