import { PoolClient } from 'pg';
import { query } from '../config/db';

/**
 * Riga della tabella "exam_mappings": una corrispondenza esame estero <-> esame
 * Ca' Foscari. Appartiene a una VERSIONE del Learning Agreement (snapshot), non
 * direttamente alla domanda. score/exam_date sono compilati al rientro (fase ToR).
 * I crediti sono NUMERIC: il driver pg li restituisce come stringa (es. "6.00").
 */
export interface ExamMappingRow {
    id: number;
    learning_agreement_id: number;
    foreign_code: string;
    foreign_title: string;
    foreign_credits: string;
    home_code: string;
    home_title: string;
    home_credits: string;
    score: string | null;
    exam_date: string | null;
    created_at: Date;
    updated_at: Date;
}

/** Input camelCase per una riga di mapping (il voto/data si gestiscono a parte). */
export interface ExamMappingInput {
    foreignCode: string;
    foreignTitle: string;
    foreignCredits: number;
    homeCode: string;
    homeTitle: string;
    homeCredits: number;
}

/** Mapping di una versione del Learning Agreement, in ordine stabile. */
export async function listExamMappingsForLearningAgreement(
    learningAgreementId: number,
): Promise<ExamMappingRow[]> {
    const result = await query<ExamMappingRow>(
        'SELECT * FROM exam_mappings WHERE learning_agreement_id = $1 ORDER BY id ASC',
        [learningAgreementId],
    );
    return result.rows;
}

/** Variante dentro transazione (per i controlli consistenti in fase di valutazione). */
export async function listExamMappingsForLearningAgreementTx(
    client: PoolClient,
    learningAgreementId: number,
): Promise<ExamMappingRow[]> {
    const result = await client.query<ExamMappingRow>(
        'SELECT * FROM exam_mappings WHERE learning_agreement_id = $1 ORDER BY id ASC',
        [learningAgreementId],
    );
    return result.rows;
}

/** Mapping di un insieme di versioni (batch, evita N+1 nella vista di dettaglio). */
export async function listExamMappingsForLearningAgreementIds(
    ids: number[],
): Promise<ExamMappingRow[]> {
    if (ids.length === 0) {
        return [];
    }
    const result = await query<ExamMappingRow>(
        'SELECT * FROM exam_mappings WHERE learning_agreement_id = ANY($1) ORDER BY id ASC',
        [ids],
    );
    return result.rows;
}

/**
 * Sostituisce in blocco le righe di mapping di una versione (delete + insert).
 * Da eseguire dentro una transazione: usata sia alla creazione della v1 sia quando
 * una nuova versione del LA porta un mapping diverso.
 */
export async function replaceExamMappingsForLearningAgreement(
    client: PoolClient,
    learningAgreementId: number,
    inputs: ExamMappingInput[],
): Promise<void> {
    await client.query('DELETE FROM exam_mappings WHERE learning_agreement_id = $1', [
        learningAgreementId,
    ]);
    for (const input of inputs) {
        await client.query(
            `INSERT INTO exam_mappings
                (learning_agreement_id, foreign_code, foreign_title, foreign_credits,
                 home_code, home_title, home_credits)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                learningAgreementId,
                input.foreignCode,
                input.foreignTitle,
                input.foreignCredits,
                input.homeCode,
                input.homeTitle,
                input.homeCredits,
            ],
        );
    }
}

/**
 * Copia il mapping da una versione all'altra (preservando l'equivalenza, azzerando
 * voti/date che appartengono alla fase ToR). Usata quando una nuova versione del LA
 * non porta un mapping esplicito: eredita quello della versione precedente.
 */
export async function copyExamMappings(
    client: PoolClient,
    fromLearningAgreementId: number,
    toLearningAgreementId: number,
): Promise<void> {
    await client.query(
        `INSERT INTO exam_mappings
            (learning_agreement_id, foreign_code, foreign_title, foreign_credits,
             home_code, home_title, home_credits)
         SELECT $2, foreign_code, foreign_title, foreign_credits,
                home_code, home_title, home_credits
         FROM exam_mappings
         WHERE learning_agreement_id = $1
         ORDER BY id ASC`,
        [fromLearningAgreementId, toLearningAgreementId],
    );
}

/** Aggiorna voto e data di una singola riga (fase ToR). */
export async function updateExamScore(
    client: PoolClient,
    mappingId: number,
    score: string | null,
    examDate: string | null,
): Promise<void> {
    await client.query(
        `UPDATE exam_mappings
         SET score = $1, exam_date = $2, updated_at = now()
         WHERE id = $3`,
        [score, examDate, mappingId],
    );
}
