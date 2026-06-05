import { PoolClient } from 'pg';
import { query } from '../config/db';
import { EvaluationDecision } from '../types/application.types';

/** Riga della tabella "transcript_of_records" (una versione fisica del file). */
export interface TranscriptRow {
    id: number;
    application_id: number;
    file_url: string;
    original_name: string;
    version_number: number;
    is_active: boolean;
    uploaded_at: Date;
}

/** Riga della tabella "transcript_of_record_evaluations" (legata a una versione). */
export interface TranscriptEvaluationRow {
    id: number;
    transcript_id: number;
    lecturer_id: number;
    decision: EvaluationDecision;
    reason: string | null;
    evaluated_at: Date;
}

/** Tutte le versioni di una domanda, dalla piu' vecchia alla piu' recente. */
export async function listTranscripts(applicationId: number): Promise<TranscriptRow[]> {
    const result = await query<TranscriptRow>(
        'SELECT * FROM transcript_of_records WHERE application_id = $1 ORDER BY version_number ASC',
        [applicationId],
    );
    return result.rows;
}

/** Cerca una versione del Transcript per id. */
export async function findTranscriptById(id: number): Promise<TranscriptRow | undefined> {
    const result = await query<TranscriptRow>('SELECT * FROM transcript_of_records WHERE id = $1', [
        id,
    ]);
    return result.rows[0];
}

/** Variante dentro transazione (per la rivalutazione consistente dello stato). */
export async function findTranscriptByIdTx(
    client: PoolClient,
    id: number,
): Promise<TranscriptRow | undefined> {
    const result = await client.query<TranscriptRow>(
        'SELECT * FROM transcript_of_records WHERE id = $1',
        [id],
    );
    return result.rows[0];
}

/** Valutazioni di un insieme di versioni (usata per la vista di dettaglio). */
export async function listEvaluationsForTranscriptIds(
    ids: number[],
): Promise<TranscriptEvaluationRow[]> {
    if (ids.length === 0) {
        return [];
    }
    const result = await query<TranscriptEvaluationRow>(
        `SELECT * FROM transcript_of_record_evaluations
         WHERE transcript_id = ANY($1)
         ORDER BY evaluated_at ASC`,
        [ids],
    );
    return result.rows;
}

/**
 * Disattiva la versione attiva corrente, calcola il numero di versione successivo
 * e inserisce la nuova versione (attiva). Da eseguire dentro una transazione.
 */
export async function insertNewTranscriptVersion(
    client: PoolClient,
    applicationId: number,
    fileUrl: string,
    originalName: string,
): Promise<TranscriptRow> {
    await client.query(
        'UPDATE transcript_of_records SET is_active = false WHERE application_id = $1 AND is_active',
        [applicationId],
    );
    const versionResult = await client.query<{ next: number }>(
        'SELECT COALESCE(MAX(version_number), 0) + 1 AS next FROM transcript_of_records WHERE application_id = $1',
        [applicationId],
    );
    const next = versionResult.rows[0]?.next ?? 1;
    const result = await client.query<TranscriptRow>(
        `INSERT INTO transcript_of_records (application_id, file_url, original_name, version_number, is_active)
         VALUES ($1, $2, $3, $4, true)
         RETURNING *`,
        [applicationId, fileUrl, originalName, next],
    );
    const transcript = result.rows[0];
    if (!transcript) {
        throw new Error('Inserimento Transcript non riuscito');
    }
    return transcript;
}

/** Inserisce una valutazione del docente per una specifica versione (dentro transazione). */
export async function insertTranscriptEvaluation(
    client: PoolClient,
    transcriptId: number,
    lecturerId: number,
    decision: EvaluationDecision,
    reason: string | null,
): Promise<TranscriptEvaluationRow> {
    const result = await client.query<TranscriptEvaluationRow>(
        `INSERT INTO transcript_of_record_evaluations
            (transcript_id, lecturer_id, decision, reason)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [transcriptId, lecturerId, decision, reason],
    );
    const evaluation = result.rows[0];
    if (!evaluation) {
        throw new Error('Inserimento valutazione non riuscito');
    }
    return evaluation;
}
