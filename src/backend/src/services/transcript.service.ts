import fs from 'node:fs';
import { AppError } from '../utils/AppError';
import { resolveUploadPath } from '../middlewares/upload.middleware';
import { withTransaction } from '../config/db';
import { AuthUser } from '../types/auth.types';
import { assertTransition, EvaluationDecision } from '../types/application.types';
import { findApplicationByIdForUpdate, setApplicationStatus } from '../models/application.model';
import { findActiveLearningAgreementTx } from '../models/learningAgreement.model';
import {
    ExamMappingRow,
    listExamMappingsForLearningAgreementTx,
    updateExamScore,
} from '../models/examMapping.model';
import {
    findTranscriptById,
    findTranscriptByIdTx,
    insertNewTranscriptVersion,
    insertTranscriptEvaluation,
    listEvaluationsForTranscriptIds,
    listTranscripts,
} from '../models/transcript.model';
import {
    assertCanEvaluate,
    assertIsOwnerStudent,
    loadReadableApplication,
} from './application.service';
import {
    toPublicApplication,
    toPublicDocument,
    toPublicEvaluation,
} from '../utils/mobilityMappers';
import { PublicApplication, PublicDocument, PublicEvaluation } from '../types/mobility.types';

/** Cancella un file di upload in modo best-effort (usata in caso di rollback). */
async function safeUnlink(storedName: string): Promise<void> {
    try {
        await fs.promises.unlink(resolveUploadPath(storedName));
    } catch {
        // Ignorato: la pulizia del file e' best-effort.
    }
}

/** Tutte le versioni del Transcript of Records con le relative valutazioni. */
export async function listTranscriptsForApplication(
    applicationId: number,
    user: AuthUser,
): Promise<PublicDocument[]> {
    await loadReadableApplication(applicationId, user);
    const rows = await listTranscripts(applicationId);
    const evaluations = await listEvaluationsForTranscriptIds(rows.map((d) => d.id));
    const evalByDoc = new Map<number, (typeof evaluations)[0]>();
    for (const e of evaluations) {
        evalByDoc.set(e.transcript_id, e);
    }
    return rows.map((d) => toPublicDocument(d, evalByDoc.get(d.id) ?? null));
}

/** Voto e data di un singolo esame, inviati insieme al Transcript of Records. */
export interface ExamResultInput {
    examMappingId: number;
    score: string;
    examDate: string;
}

/**
 * Verifica che i risultati forniti coprano ESATTAMENTE gli esami del mapping attivo:
 * nessun id estraneo e nessun esame senza voto. Lancia AppError(400) altrimenti.
 */
function assertResultsMatchMappings(results: ExamResultInput[], mappings: ExamMappingRow[]): void {
    const mappingIds = new Set(mappings.map((m) => m.id));
    const providedIds = new Set<number>();
    for (const r of results) {
        if (!mappingIds.has(r.examMappingId)) {
            throw new AppError(
                400,
                `L'esame ${r.examMappingId} non appartiene al Learning Agreement attivo`,
            );
        }
        providedIds.add(r.examMappingId);
    }
    if (providedIds.size !== mappingIds.size) {
        throw new AppError(
            400,
            'Vanno forniti voto e data per tutti gli esami del Learning Agreement',
        );
    }
}

/**
 * Carica una nuova versione del Transcript of Records insieme ai voti degli esami.
 * Transizione MOBILITY_IN_PROGRESS | TOR_REJECTED -> TOR_SUBMITTED. Solo lo studente proprietario.
 * I voti vanno sui mapping della versione LA attiva e devono coprirli tutti: cosi' un ToR
 * inviato porta gia' con se' i risultati completi (niente passo separato di compilazione).
 */
export async function uploadTranscript(
    applicationId: number,
    user: AuthUser,
    storedName: string,
    originalName: string,
    results: ExamResultInput[],
): Promise<{ transcript: PublicDocument; application: PublicApplication }> {
    try {
        const result = await withTransaction(async (client) => {
            const app = await findApplicationByIdForUpdate(client, applicationId);
            if (!app) {
                throw new AppError(404, 'Domanda non trovata');
            }
            assertIsOwnerStudent(app, user);
            assertTransition(app.status, 'TOR_SUBMITTED');

            // I voti si scrivono sui mapping della versione LA attiva: devono coprirli tutti.
            const activeLa = await findActiveLearningAgreementTx(client, applicationId);
            if (!activeLa) {
                throw new AppError(500, 'Versione attiva del Learning Agreement mancante');
            }
            const mappings = await listExamMappingsForLearningAgreementTx(client, activeLa.id);
            assertResultsMatchMappings(results, mappings);

            const tor = await insertNewTranscriptVersion(
                client,
                applicationId,
                storedName,
                originalName,
            );
            for (const r of results) {
                await updateExamScore(client, r.examMappingId, r.score, r.examDate);
            }
            const updatedApp = await setApplicationStatus(client, applicationId, 'TOR_SUBMITTED');
            return { tor, updatedApp };
        });
        return {
            transcript: toPublicDocument(result.tor, null),
            application: toPublicApplication(result.updatedApp),
        };
    } catch (err) {
        await safeUnlink(storedName);
        throw err;
    }
}

/** Restituisce i dati necessari al download (dopo la guardia di lettura). */
export async function getTranscriptForDownload(
    applicationId: number,
    transcriptId: number,
    user: AuthUser,
): Promise<{ storedName: string; originalName: string }> {
    await loadReadableApplication(applicationId, user);
    const tor = await findTranscriptById(transcriptId);
    if (!tor || tor.application_id !== applicationId) {
        throw new AppError(404, 'Transcript non trovato');
    }
    return { storedName: tor.file_url, originalName: tor.original_name };
}

/**
 * Valutazione del docente referente su una specifica versione.
 * Transizione TOR_SUBMITTED -> TOR_APPROVED | TOR_REJECTED.
 */
export async function evaluateTranscript(
    applicationId: number,
    transcriptId: number,
    user: AuthUser,
    decision: EvaluationDecision,
    reason: string | null,
): Promise<{ evaluation: PublicEvaluation; application: PublicApplication }> {
    const result = await withTransaction(async (client) => {
        const app = await findApplicationByIdForUpdate(client, applicationId);
        if (!app) {
            throw new AppError(404, 'Domanda non trovata');
        }
        assertCanEvaluate(app, user);

        const tor = await findTranscriptByIdTx(client, transcriptId);
        if (!tor || tor.application_id !== applicationId) {
            throw new AppError(404, 'Transcript non trovato');
        }
        if (!tor.is_active) {
            throw new AppError(409, "Questa versione non e' piu' attiva: valuta l'ultima caricata");
        }

        const target = decision === 'APPROVED' ? 'TOR_APPROVED' : 'TOR_REJECTED';
        assertTransition(app.status, target);

        if (decision === 'APPROVED') {
            const activeLa = await findActiveLearningAgreementTx(client, applicationId);
            if (!activeLa) {
                throw new AppError(500, 'Versione attiva del Learning Agreement mancante');
            }
            const mappings = await listExamMappingsForLearningAgreementTx(client, activeLa.id);
            const incomplete = mappings.some((m) => !m.score || !m.exam_date);
            if (mappings.length === 0 || incomplete) {
                throw new AppError(
                    409,
                    'Tutti gli esami devono avere voto e data prima di approvare il Transcript',
                );
            }
        }

        const evaluation = await insertTranscriptEvaluation(
            client,
            transcriptId,
            user.id,
            decision,
            reason,
        );
        const updatedApp = await setApplicationStatus(client, applicationId, target);
        return { evaluation, updatedApp };
    });
    return {
        evaluation: toPublicEvaluation(result.evaluation),
        application: toPublicApplication(result.updatedApp),
    };
}
