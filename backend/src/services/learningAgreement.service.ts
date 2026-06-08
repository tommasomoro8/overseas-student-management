import fs from 'node:fs';
import { PoolClient } from 'pg';
import { AppError } from '../utils/AppError';
import { resolveUploadPath } from '../middlewares/upload.middleware';
import { withTransaction } from '../config/db';
import { AuthUser } from '../types/auth.types';
import { assertTransition, EvaluationDecision } from '../types/application.types';
import { findApplicationByIdForUpdate, setApplicationStatus } from '../models/application.model';
import {
    findActiveLearningAgreementTx,
    findLearningAgreementById,
    findLearningAgreementByIdTx,
    findPreviousLearningAgreementTx,
    insertLearningAgreementEvaluation,
    insertNewLearningAgreementVersion,
    LearningAgreementRow,
    listEvaluationsForLearningAgreementIds,
    listLearningAgreements,
    setLearningAgreementActive,
} from '../models/learningAgreement.model';
import {
    copyExamMappings,
    ExamMappingInput,
    listExamMappingsForLearningAgreement,
    listExamMappingsForLearningAgreementIds,
    replaceExamMappingsForLearningAgreement,
} from '../models/examMapping.model';
import {
    assertCanEvaluate,
    assertIsOwnerStudent,
    loadReadableApplication,
} from './application.service';
import {
    toPublicApplication,
    toPublicEvaluation,
    toPublicLearningAgreement,
} from '../utils/mobilityMappers';
import {
    PublicApplication,
    PublicEvaluation,
    PublicLearningAgreement,
} from '../types/mobility.types';

/** Cancella un file di upload in modo best-effort (usata in caso di rollback). */
async function safeUnlink(storedName: string): Promise<void> {
    try {
        await fs.promises.unlink(resolveUploadPath(storedName));
    } catch {
        // Ignorato: la pulizia del file e' best-effort.
    }
}

/**
 * Imposta il mapping di una nuova versione: usa quello fornito, oppure eredita
 * quello della versione precedente (es. ricarico solo il PDF dopo un rifiuto).
 */
async function carryExamMappings(
    client: PoolClient,
    previous: LearningAgreementRow | undefined,
    newLearningAgreementId: number,
    examMappings: ExamMappingInput[] | undefined,
): Promise<void> {
    if (examMappings && examMappings.length > 0) {
        await replaceExamMappingsForLearningAgreement(client, newLearningAgreementId, examMappings);
    } else if (previous) {
        await copyExamMappings(client, previous.id, newLearningAgreementId);
    }
}

/** Tutte le versioni del Learning Agreement con valutazioni e mapping esami. */
export async function listLearningAgreementsForApplication(
    applicationId: number,
    user: AuthUser,
): Promise<PublicLearningAgreement[]> {
    await loadReadableApplication(applicationId, user);
    const rows = await listLearningAgreements(applicationId);
    const ids = rows.map((d) => d.id);
    const evaluations = await listEvaluationsForLearningAgreementIds(ids);
    const mappings = await listExamMappingsForLearningAgreementIds(ids);

    const evalByDoc = new Map<number, (typeof evaluations)[0]>();
    for (const e of evaluations) {
        evalByDoc.set(e.learning_agreement_id, e);
    }
    const mappingsByDoc = new Map<number, typeof mappings>();
    for (const m of mappings) {
        const list = mappingsByDoc.get(m.learning_agreement_id);
        if (list) list.push(m);
        else mappingsByDoc.set(m.learning_agreement_id, [m]);
    }
    return rows.map((d) =>
        toPublicLearningAgreement(d, evalByDoc.get(d.id) ?? null, mappingsByDoc.get(d.id) ?? []),
    );
}

/**
 * Invio del Learning Agreement: ogni invio crea una nuova versione con il file PDF e
 * il mapping esami (il mapping fa parte del documento). Il comportamento per stato:
 *  - DRAFT / LA_REJECTED   -> LA_SUBMITTED        (mapping obbligatorio al primo invio,
 *                                                  ereditabile ai successivi)
 *  - MOBILITY_IN_PROGRESS  -> LA_CHANGE_SUBMITTED (modifica in mobilita', descrizione obbligatoria)
 * Solo lo studente proprietario.
 */
export async function submitLearningAgreement(
    applicationId: number,
    user: AuthUser,
    storedName: string,
    originalName: string,
    examMappings: ExamMappingInput[] | undefined,
    changeDescription: string | undefined,
): Promise<{ learningAgreement: PublicLearningAgreement; application: PublicApplication }> {
    try {
        const result = await withTransaction(async (client) => {
            const app = await findApplicationByIdForUpdate(client, applicationId);
            if (!app) {
                throw new AppError(404, 'Domanda non trovata');
            }
            assertIsOwnerStudent(app, user);

            let target: 'LA_SUBMITTED' | 'LA_CHANGE_SUBMITTED';
            if (app.status === 'DRAFT' || app.status === 'LA_REJECTED') {
                target = 'LA_SUBMITTED';
            } else if (app.status === 'MOBILITY_IN_PROGRESS') {
                target = 'LA_CHANGE_SUBMITTED';
            } else {
                throw new AppError(
                    409,
                    `Non e' possibile inviare un Learning Agreement nello stato ${app.status}`,
                );
            }
            assertTransition(app.status, target);

            const previous = await findActiveLearningAgreementTx(client, applicationId);

            // Al primo invio (nessuna versione precedente) il mapping e' obbligatorio.
            if (!previous && (!examMappings || examMappings.length === 0)) {
                throw new AppError(
                    400,
                    "Il mapping degli esami e' obbligatorio al primo invio del Learning Agreement",
                );
            }
            // Una modifica durante la mobilita' richiede una descrizione.
            if (target === 'LA_CHANGE_SUBMITTED' && !changeDescription) {
                throw new AppError(
                    400,
                    "La descrizione della modifica e' obbligatoria durante la mobilita'",
                );
            }

            const la = await insertNewLearningAgreementVersion(
                client,
                applicationId,
                storedName,
                originalName,
                target === 'LA_CHANGE_SUBMITTED' ? (changeDescription ?? null) : null,
            );
            await carryExamMappings(client, previous, la.id, examMappings);
            const updatedApp = await setApplicationStatus(client, applicationId, target);
            return { la, updatedApp };
        });

        const mappings = await listExamMappingsForLearningAgreement(result.la.id);
        return {
            learningAgreement: toPublicLearningAgreement(result.la, null, mappings),
            application: toPublicApplication(result.updatedApp),
        };
    } catch (err) {
        // Il file e' gia' su disco (multer lo scrive prima del service): rimuoviamo l'orfano.
        await safeUnlink(storedName);
        throw err;
    }
}

/** Restituisce i dati necessari al download (dopo la guardia di lettura). */
export async function getLearningAgreementForDownload(
    applicationId: number,
    learningAgreementId: number,
    user: AuthUser,
): Promise<{ storedName: string; originalName: string }> {
    await loadReadableApplication(applicationId, user);
    const la = await findLearningAgreementById(learningAgreementId);
    if (!la || la.application_id !== applicationId) {
        throw new AppError(404, 'Learning Agreement non trovato');
    }
    return { storedName: la.file_url, originalName: la.original_name };
}

/**
 * Valutazione del docente referente su una versione attiva.
 *  - da LA_SUBMITTED        -> LA_APPROVED | LA_REJECTED
 *  - da LA_CHANGE_SUBMITTED -> MOBILITY_IN_PROGRESS (su rifiuto ripristina la versione precedente)
 */
export async function evaluateLearningAgreement(
    applicationId: number,
    learningAgreementId: number,
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

        const la = await findLearningAgreementByIdTx(client, learningAgreementId);
        if (!la || la.application_id !== applicationId) {
            throw new AppError(404, 'Learning Agreement non trovato');
        }
        if (!la.is_active) {
            throw new AppError(409, "Questa versione non e' piu' attiva: valuta l'ultima inviata");
        }

        if (app.status === 'LA_SUBMITTED') {
            const target = decision === 'APPROVED' ? 'LA_APPROVED' : 'LA_REJECTED';
            assertTransition(app.status, target);
            const evaluation = await insertLearningAgreementEvaluation(
                client,
                la.id,
                user.id,
                decision,
                reason,
            );
            const updatedApp = await setApplicationStatus(client, applicationId, target);
            return { evaluation, updatedApp };
        }

        if (app.status === 'LA_CHANGE_SUBMITTED') {
            assertTransition(app.status, 'MOBILITY_IN_PROGRESS');
            const evaluation = await insertLearningAgreementEvaluation(
                client,
                la.id,
                user.id,
                decision,
                reason,
            );
            if (decision === 'REJECTED') {
                // Ripristino: disattiva la modifica rifiutata e riattiva la versione precedente.
                const previous = await findPreviousLearningAgreementTx(
                    client,
                    applicationId,
                    la.version_number,
                );
                if (!previous) {
                    throw new AppError(500, 'Versione precedente da ripristinare non trovata');
                }
                await setLearningAgreementActive(client, la.id, false);
                await setLearningAgreementActive(client, previous.id, true);
            }
            const updatedApp = await setApplicationStatus(
                client,
                applicationId,
                'MOBILITY_IN_PROGRESS',
            );
            return { evaluation, updatedApp };
        }

        throw new AppError(
            409,
            `Non e' possibile valutare il Learning Agreement nello stato ${app.status}`,
        );
    });
    return {
        evaluation: toPublicEvaluation(result.evaluation),
        application: toPublicApplication(result.updatedApp),
    };
}
