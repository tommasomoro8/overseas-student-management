import { AppError } from '../utils/AppError';
import { withTransaction } from '../config/db';
import { AuthUser } from '../types/auth.types';
import { ApplicationStatus, MobilityPeriod, assertTransition } from '../types/application.types';
import {
    ApplicationRow,
    createApplication as createApplicationRow,
    findApplicationById,
    findApplicationByIdForUpdate,
    listAllApplications,
    listApplicationsForLecturer,
    listApplicationsForStudent,
    markClosed,
    markPreDepartureApproved,
    enterMobilityInProgress,
    updateMobilityDates,
} from '../models/application.model';
import { findInstitutionById, listInstitutions } from '../models/institution.model';
import { findUserById, listUsers } from '../models/user.model';
import {
    listEvaluationsForLearningAgreementIds,
    listLearningAgreements,
} from '../models/learningAgreement.model';
import { listEvaluationsForTranscriptIds, listTranscripts } from '../models/transcript.model';
import { listExamMappingsForLearningAgreementIds } from '../models/examMapping.model';
import {
    toPublicApplication,
    toPublicDocument,
    toPublicExamMapping,
    toPublicInstitution,
    toPublicLearningAgreement,
    toPublicUserSummary,
} from '../utils/mobilityMappers';
import {
    ApplicationDetail,
    PublicApplication,
    PublicInstitution,
    PublicUserSummary,
} from '../types/mobility.types';

/** Domanda con istituzione e partecipanti (studente + referente) allegati: usata negli elenchi. */
export type ApplicationListItem = PublicApplication & {
    institution: PublicInstitution | null;
    student: PublicUserSummary | null;
    lecturer: PublicUserSummary | null;
};

// --- Guardie di autorizzazione (riusate dai moduli LA/ToR/exam-mapping) ---

/** True se l'utente puo' leggere la domanda: proprietario | referente | ufficio. */
function canReadApplication(app: ApplicationRow, user: AuthUser): boolean {
    if (user.role === 'office') {
        return true;
    }
    if (user.role === 'student') {
        return app.student_id === user.id;
    }
    if (user.role === 'lecturer') {
        return app.referent_lecturer_id === user.id;
    }
    return false;
}

/** Lancia 403 se l'utente non puo' leggere la domanda. */
export function assertCanReadApplication(app: ApplicationRow, user: AuthUser): void {
    if (!canReadApplication(app, user)) {
        throw new AppError(403, 'Non hai i permessi per accedere a questa domanda');
    }
}

/** Carica una domanda applicando la guardia di lettura (404 se assente, 403 se non autorizzato). */
export async function loadReadableApplication(
    applicationId: number,
    user: AuthUser,
): Promise<ApplicationRow> {
    const app = await findApplicationById(applicationId);
    if (!app) {
        throw new AppError(404, 'Domanda non trovata');
    }

    assertCanReadApplication(app, user);

    return app;
}

/** Lancia 403 se l'utente non e' lo studente proprietario della domanda. */
export function assertIsOwnerStudent(app: ApplicationRow, user: AuthUser): void {
    if (!(user.role === 'student' && app.student_id === user.id)) {
        throw new AppError(403, "Solo lo studente proprietario puo' eseguire questa operazione");
    }
}

/**
 * Lancia 403 se l'utente non e' il docente referente della domanda.
 * Lo spec assegna al solo referente la valutazione di LA, modifiche e ToR;
 * l'ufficio interviene solo su verifica pre-partenza e chiusura.
 */
export function assertCanEvaluate(app: ApplicationRow, user: AuthUser): void {
    const isReferent = user.role === 'lecturer' && app.referent_lecturer_id === user.id;
    if (!isReferent) {
        throw new AppError(403, "Solo il docente referente puo' valutare questa domanda");
    }
}

// --- Creazione ---

export interface CreateApplicationServiceInput {
    studentId: number;
    referentLecturerId: number;
    hostInstitutionId: number;
    academicYear: string;
    expectedPeriod: MobilityPeriod;
}

/** Crea la domanda (DRAFT). Mapping e Learning Agreement si aggiungono con l'upload del LA. */
export async function createApplication(
    input: CreateApplicationServiceInput,
): Promise<PublicApplication> {
    // Il referente deve esistere ed essere un docente.
    const lecturer = await findUserById(input.referentLecturerId);
    if (!lecturer || lecturer.role !== 'lecturer') {
        throw new AppError(400, 'Il referente indicato deve essere un docente valido');
    }
    // L'istituzione ospitante deve esistere.
    const institution = await findInstitutionById(input.hostInstitutionId);
    if (!institution) {
        throw new AppError(400, 'Istituzione ospitante non valida');
    }
    const row = await createApplicationRow(input);
    return toPublicApplication(row);
}

// --- Elenco (filtrato per ruolo) ---

export async function listApplications(
    user: AuthUser,
    status: ApplicationStatus | null,
): Promise<ApplicationListItem[]> {
    let rows: ApplicationRow[];
    if (user.role === 'student') {
        rows = await listApplicationsForStudent(user.id, status);
    } else if (user.role === 'lecturer') {
        rows = await listApplicationsForLecturer(user.id, status);
    } else {
        rows = await listAllApplications(status);
    }

    // Arricchimento con istituzione e partecipanti (tabelle piccole: una query ciascuna).
    const institutions = await listInstitutions();
    const instById = new Map(institutions.map((i) => [i.id, toPublicInstitution(i)]));
    const users = await listUsers();
    const userById = new Map(users.map((u) => [u.id, toPublicUserSummary(u)]));
    return rows.map((row) => ({
        ...toPublicApplication(row),
        institution: instById.get(row.host_institution_id) ?? null,
        student: userById.get(row.student_id) ?? null,
        lecturer: userById.get(row.referent_lecturer_id) ?? null,
    }));
}

// --- Dettaglio ---

function groupByKey<T>(items: T[], keyOf: (item: T) => number): Map<number, T[]> {
    const map = new Map<number, T[]>();
    for (const item of items) {
        const key = keyOf(item);
        const existing = map.get(key);
        if (existing) {
            existing.push(item);
        } else {
            map.set(key, [item]);
        }
    }
    return map;
}

export async function getApplicationDetail(
    applicationId: number,
    user: AuthUser,
): Promise<ApplicationDetail> {
    const app = await loadReadableApplication(applicationId, user);

    const institutionRow = await findInstitutionById(app.host_institution_id);
    const studentRow = await findUserById(app.student_id);
    const lecturerRow = await findUserById(app.referent_lecturer_id);

    const learningAgreements = await listLearningAgreements(applicationId);
    const laIds = learningAgreements.map((d) => d.id);
    const laEvals = await listEvaluationsForLearningAgreementIds(laIds);
    const laMappings = await listExamMappingsForLearningAgreementIds(laIds);

    const transcripts = await listTranscripts(applicationId);
    const torEvals = await listEvaluationsForTranscriptIds(transcripts.map((d) => d.id));

    const laEvalByDoc = new Map(laEvals.map((e) => [e.learning_agreement_id, e]));
    const torEvalByDoc = new Map(torEvals.map((e) => [e.transcript_id, e]));
    const mappingsByLa = groupByKey(laMappings, (m) => m.learning_agreement_id);

    const activeLa = learningAgreements.find((d) => d.is_active);
    const activeMappings = activeLa ? (mappingsByLa.get(activeLa.id) ?? []) : [];

    return {
        ...toPublicApplication(app),
        institution: institutionRow ? toPublicInstitution(institutionRow) : null,
        student: studentRow ? toPublicUserSummary(studentRow) : null,
        lecturer: lecturerRow ? toPublicUserSummary(lecturerRow) : null,
        learningAgreements: learningAgreements.map((d) =>
            toPublicLearningAgreement(
                d,
                laEvalByDoc.get(d.id) ?? null,
                mappingsByLa.get(d.id) ?? [],
            ),
        ),
        transcripts: transcripts.map((d) => toPublicDocument(d, torEvalByDoc.get(d.id) ?? null)),
        activeExamMappings: activeMappings.map(toPublicExamMapping),
    };
}

// --- Transizioni a livello domanda ---

/** Approvazione pre-partenza dell'ufficio: LA_APPROVED -> PRE_DEPARTURE_APPROVED. */
export async function approvePreDeparture(applicationId: number): Promise<PublicApplication> {
    const row = await withTransaction(async (client) => {
        const app = await findApplicationByIdForUpdate(client, applicationId);
        if (!app) {
            throw new AppError(404, 'Domanda non trovata');
        }
        assertTransition(app.status, 'PRE_DEPARTURE_APPROVED');
        return markPreDepartureApproved(client, applicationId);
    });
    return toPublicApplication(row);
}

/** Chiusura definitiva dell'ufficio: TOR_APPROVED -> CLOSED. */
export async function closeApplication(applicationId: number): Promise<PublicApplication> {
    const row = await withTransaction(async (client) => {
        const app = await findApplicationByIdForUpdate(client, applicationId);
        if (!app) {
            throw new AppError(404, 'Domanda non trovata');
        }
        assertTransition(app.status, 'CLOSED');
        return markClosed(client, applicationId);
    });
    return toPublicApplication(row);
}

/**
 * Date effettive di mobilita' (solo studente proprietario):
 *  - da PRE_DEPARTURE_APPROVED                  -> avvia la mobilita' (MOBILITY_IN_PROGRESS):
 *    le date sono obbligatorie per entrare nella fase "during mobility";
 *  - in MOBILITY_IN_PROGRESS, LA_CHANGE_SUBMITTED, TOR_SUBMITTED o TOR_REJECTED -> correzione
 *    delle date gia' inserite (es. rientro reale), senza cambiare stato.
 */
export async function insertMobilityDates(
    applicationId: number,
    user: AuthUser,
    arrivalDate: string,
    departureDate: string,
): Promise<PublicApplication> {
    const row = await withTransaction(async (client) => {
        const app = await findApplicationByIdForUpdate(client, applicationId);
        if (!app) {
            throw new AppError(404, 'Domanda non trovata');
        }
        assertIsOwnerStudent(app, user);

        if (app.status === 'PRE_DEPARTURE_APPROVED') {
            assertTransition(app.status, 'MOBILITY_IN_PROGRESS');
            return enterMobilityInProgress(client, applicationId, arrivalDate, departureDate);
        }
        if (
            app.status === 'MOBILITY_IN_PROGRESS' ||
            app.status === 'LA_CHANGE_SUBMITTED' ||
            app.status === 'TOR_SUBMITTED' ||
            app.status === 'TOR_REJECTED'
        ) {
            return updateMobilityDates(client, applicationId, arrivalDate, departureDate);
        }
        throw new AppError(
            409,
            "Le date di mobilita' si possono inserire solo dopo l'approvazione pre-partenza",
        );
    });
    return toPublicApplication(row);
}
