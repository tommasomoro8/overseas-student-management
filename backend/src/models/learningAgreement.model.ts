import { PoolClient } from 'pg';
import { query } from '../config/db';
import { EvaluationDecision } from '../types/application.types';

/**
 * Riga della tabella "learning_agreements" (una versione del documento: file + mapping).
 * change_description e' valorizzata solo per le modifiche proposte durante la mobilita' (Step 2).
 */
export interface LearningAgreementRow {
    id: number;
    application_id: number;
    file_url: string;
    original_name: string;
    version_number: number;
    is_active: boolean;
    change_description: string | null;
    uploaded_at: Date;
}

/** Riga della tabella "learning_agreement_evaluations" (legata a una versione). */
export interface LearningAgreementEvaluationRow {
    id: number;
    learning_agreement_id: number;
    lecturer_id: number;
    decision: EvaluationDecision;
    reason: string | null;
    evaluated_at: Date;
}

/** Tutte le versioni di una domanda, dalla piu' vecchia alla piu' recente. */
export async function listLearningAgreements(
    applicationId: number,
): Promise<LearningAgreementRow[]> {
    const result = await query<LearningAgreementRow>(
        'SELECT * FROM learning_agreements WHERE application_id = $1 ORDER BY version_number ASC',
        [applicationId],
    );
    return result.rows;
}

/** Cerca una versione del Learning Agreement per id. */
export async function findLearningAgreementById(
    id: number,
): Promise<LearningAgreementRow | undefined> {
    const result = await query<LearningAgreementRow>(
        'SELECT * FROM learning_agreements WHERE id = $1',
        [id],
    );
    return result.rows[0];
}

/** Variante dentro transazione (per la rivalutazione consistente dello stato). */
export async function findLearningAgreementByIdTx(
    client: PoolClient,
    id: number,
): Promise<LearningAgreementRow | undefined> {
    const result = await client.query<LearningAgreementRow>(
        'SELECT * FROM learning_agreements WHERE id = $1',
        [id],
    );
    return result.rows[0];
}

/** Valutazioni di un insieme di versioni (usata per la vista di dettaglio). */
export async function listEvaluationsForLearningAgreementIds(
    ids: number[],
): Promise<LearningAgreementEvaluationRow[]> {
    if (ids.length === 0) {
        return [];
    }
    const result = await query<LearningAgreementEvaluationRow>(
        `SELECT * FROM learning_agreement_evaluations
         WHERE learning_agreement_id = ANY($1)
         ORDER BY evaluated_at ASC`,
        [ids],
    );
    return result.rows;
}

/**
 * Disattiva la versione attiva corrente, calcola il numero di versione successivo
 * e inserisce la nuova versione (attiva, con file). change_description e' valorizzata
 * per le modifiche durante la mobilita'. Da eseguire dentro una transazione.
 */
export async function insertNewLearningAgreementVersion(
    client: PoolClient,
    applicationId: number,
    fileUrl: string,
    originalName: string,
    changeDescription: string | null,
): Promise<LearningAgreementRow> {
    await client.query(
        'UPDATE learning_agreements SET is_active = false WHERE application_id = $1 AND is_active',
        [applicationId],
    );
    const versionResult = await client.query<{ next: number }>(
        'SELECT COALESCE(MAX(version_number), 0) + 1 AS next FROM learning_agreements WHERE application_id = $1',
        [applicationId],
    );
    const next = versionResult.rows[0]?.next ?? 1;
    const result = await client.query<LearningAgreementRow>(
        `INSERT INTO learning_agreements
            (application_id, file_url, original_name, version_number, is_active, change_description)
         VALUES ($1, $2, $3, $4, true, $5)
         RETURNING *`,
        [applicationId, fileUrl, originalName, next, changeDescription],
    );
    const learningAgreement = result.rows[0];
    if (!learningAgreement) {
        throw new Error('Inserimento Learning Agreement non riuscito');
    }
    return learningAgreement;
}

/** Versione attualmente attiva di una domanda (dentro transazione). */
export async function findActiveLearningAgreementTx(
    client: PoolClient,
    applicationId: number,
): Promise<LearningAgreementRow | undefined> {
    const result = await client.query<LearningAgreementRow>(
        'SELECT * FROM learning_agreements WHERE application_id = $1 AND is_active',
        [applicationId],
    );
    return result.rows[0];
}

/**
 * Versione da riattivare in caso di rifiuto di una modifica: quella con il
 * version_number massimo strettamente minore di quella rifiutata (l'ultima approvata).
 */
export async function findPreviousLearningAgreementTx(
    client: PoolClient,
    applicationId: number,
    rejectedVersionNumber: number,
): Promise<LearningAgreementRow | undefined> {
    const result = await client.query<LearningAgreementRow>(
        `SELECT * FROM learning_agreements
         WHERE application_id = $1 AND version_number < $2
         ORDER BY version_number DESC
         LIMIT 1`,
        [applicationId, rejectedVersionNumber],
    );
    return result.rows[0];
}

/** Imposta lo stato attivo di una versione (usata nel ripristino su rifiuto). */
export async function setLearningAgreementActive(
    client: PoolClient,
    learningAgreementId: number,
    active: boolean,
): Promise<void> {
    await client.query('UPDATE learning_agreements SET is_active = $1 WHERE id = $2', [
        active,
        learningAgreementId,
    ]);
}

/** Inserisce una valutazione del docente per una specifica versione (dentro transazione). */
export async function insertLearningAgreementEvaluation(
    client: PoolClient,
    learningAgreementId: number,
    lecturerId: number,
    decision: EvaluationDecision,
    reason: string | null,
): Promise<LearningAgreementEvaluationRow> {
    const result = await client.query<LearningAgreementEvaluationRow>(
        `INSERT INTO learning_agreement_evaluations
            (learning_agreement_id, lecturer_id, decision, reason)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [learningAgreementId, lecturerId, decision, reason],
    );
    const evaluation = result.rows[0];
    if (!evaluation) {
        throw new Error('Inserimento valutazione non riuscito');
    }
    return evaluation;
}
