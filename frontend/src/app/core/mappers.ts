/* ===========================================================================
   Overseas Mobility — mapping DTO backend -> view-model UI.
   Qui si concentra l'allineamento alle regole del backend: derivazione di fase,
   stato dei documenti, modifiche (= versioni LA con changeDescription) e timeline.
   =========================================================================== */
import {
    ApplicationDetail,
    ApplicationListItem,
    MobilityPeriod,
    PERIOD_LABEL,
    PublicExamMapping,
    PublicInstitution,
    PublicLearningAgreement,
    PublicUserSummary,
} from './api.types';
import {
    Application,
    DocStatus,
    Exam,
    Institution,
    Lecturer,
    Role,
    Status,
    StepState,
    Student,
    TimelineStep,
} from './models';
import { phaseOf } from './ovs-data';

function periodVM(p: MobilityPeriod) {
    return { id: p, label: PERIOD_LABEL[p] };
}

function institutionVM(inst: PublicInstitution | null): Institution {
    if (!inst) return { id: 0, name: '—', city: '', country: '', flag: '🌍' };
    return {
        id: inst.id,
        name: inst.name,
        city: inst.city,
        country: inst.country,
        flag: inst.flag || '🌍',
        erasmusCode: inst.erasmusCode,
    };
}

function studentVM(s: PublicUserSummary | null): Student {
    if (!s) return { id: 0, name: '—', matricola: null };
    return { id: s.id, name: `${s.firstName} ${s.lastName}`, matricola: s.matriculationNumber };
}

function lecturerVM(l: PublicUserSummary | null): Lecturer {
    if (!l) return { id: 0, name: '—', title: '' };
    return { id: l.id, name: `${l.firstName} ${l.lastName}`, title: '' };
}

function examVM(m: PublicExamMapping): Exam {
    return {
        mappingId: m.id,
        foreignCode: m.foreignCode,
        foreignName: m.foreignTitle,
        foreignCredits: m.foreignCredits,
        cfCode: m.homeCode,
        cfTitle: m.homeTitle,
        cfCredits: m.homeCredits,
        score: m.score,
        examDate: m.examDate,
    };
}

function laStatus(la: PublicLearningAgreement, appStatus: Status): DocStatus {
    if (la.evaluation) return la.evaluation.decision === 'APPROVED' ? 'approved' : 'rejected';
    if (la.isActive && (appStatus === 'LA_SUBMITTED' || appStatus === 'LA_CHANGE_SUBMITTED'))
        return 'pending';
    return la.isActive ? 'approved' : 'rejected';
}

function torStatus(
    evaluation: { decision: 'APPROVED' | 'REJECTED' } | null,
    isActive: boolean,
    appStatus: Status,
): DocStatus {
    if (evaluation) return evaluation.decision === 'APPROVED' ? 'approved' : 'rejected';
    if (isActive && appStatus === 'TOR_SUBMITTED') return 'pending';
    return isActive ? 'approved' : 'rejected';
}

/** Posizione corrente nella sequenza canonica di 8 step, per stato. */
const STEP_INDEX: Record<Status, number> = {
    DRAFT: 1,
    LA_REJECTED: 1,
    LA_SUBMITTED: 2,
    LA_APPROVED: 3,
    PRE_DEPARTURE_APPROVED: 4,
    MOBILITY_IN_PROGRESS: 5,
    LA_CHANGE_SUBMITTED: 5,
    TOR_REJECTED: 5,
    TOR_SUBMITTED: 6,
    TOR_APPROVED: 7,
    CLOSED: 8,
};

interface TimelineSource {
    status: Status;
    createdAt: string;
    preDepartureApprovedAt: string | null;
    mobilityDatesInsertedAt: string | null;
    closedAt: string | null;
    learningAgreements?: PublicLearningAgreement[];
    transcripts?: {
        uploadedAt: string;
        isActive: boolean;
        evaluation: {
            decision: 'APPROVED' | 'REJECTED';
            reason: string | null;
            evaluatedAt: string;
        } | null;
    }[];
}

/** Descrizione di uno step: chi è l'attore e le 3 varianti di testo (fatto / tocca a me / attesa). */
interface StepDef {
    actorRole: Role;
    at: string | null;
    doneLabel: string; // step già eseguito
    selfTodoLabel: string; // tocca a chi guarda (imperativo)
    otherWaitLabel: string; // tocca a un altro ruolo (attesa)
}

/** Attribuzione "da te / dallo studente / dal docente / dall'ufficio" dal punto di vista di chi guarda. */
function byFor(actorRole: Role, viewerRole: Role): string {
    if (actorRole === viewerRole) return 'te';
    return actorRole === 'student' ? 'studente' : actorRole === 'lecturer' ? 'docente' : 'ufficio';
}

function buildTimeline(src: TimelineSource, viewerRole: Role): TimelineStep[] {
    const current = STEP_INDEX[src.status];
    const las = src.learningAgreements ?? [];
    const tors = src.transcripts ?? [];

    const firstLaAt = las.length ? las[0].uploadedAt : null;
    const approvedLaEval =
        las.map((l) => l.evaluation).find((e) => e && e.decision === 'APPROVED') ?? null;
    const activeTor = tors.find((t) => t.isActive) ?? (tors.length ? tors[tors.length - 1] : null);
    const approvedTorEval =
        tors.map((t) => t.evaluation).find((e) => e && e.decision === 'APPROVED') ?? null;
    const lastRejectedLa = [...las]
        .reverse()
        .find((l) => l.evaluation && l.evaluation.decision === 'REJECTED');
    const lastRejectedTor = [...tors]
        .reverse()
        .find((t) => t.evaluation && t.evaluation.decision === 'REJECTED');

    const defs: StepDef[] = [
        {
            actorRole: 'student',
            at: src.createdAt,
            doneLabel: 'Domanda creata',
            selfTodoLabel: 'Crea la domanda',
            otherWaitLabel: 'In attesa della domanda',
        },
        {
            actorRole: 'student',
            at: firstLaAt,
            doneLabel: 'Learning Agreement inviato',
            selfTodoLabel: 'Invia il Learning Agreement',
            otherWaitLabel: 'In attesa del Learning Agreement',
        },
        {
            actorRole: 'lecturer',
            at: approvedLaEval ? approvedLaEval.evaluatedAt : null,
            doneLabel: 'Learning Agreement approvato',
            selfTodoLabel: 'Valuta il Learning Agreement',
            otherWaitLabel: "In attesa dell'approvazione del docente",
        },
        {
            actorRole: 'office',
            at: src.preDepartureApprovedAt,
            doneLabel: 'Pre-partenza verificata',
            selfTodoLabel: 'Verifica la pre-partenza',
            otherWaitLabel: "In attesa della verifica dell'ufficio",
        },
        {
            actorRole: 'student',
            at: src.mobilityDatesInsertedAt,
            doneLabel: 'Date di mobilità inserite',
            selfTodoLabel: 'Inserisci le date di mobilità',
            otherWaitLabel: 'In attesa delle date di mobilità',
        },
        {
            actorRole: 'student',
            at: activeTor ? activeTor.uploadedAt : null,
            doneLabel: 'Transcript of Records caricato',
            selfTodoLabel: 'Concludi il periodo di mobilità',
            otherWaitLabel: 'In attesa del Transcript of Records',
        },
        {
            actorRole: 'lecturer',
            at: approvedTorEval ? approvedTorEval.evaluatedAt : null,
            doneLabel: 'Esami approvati dal docente',
            selfTodoLabel: 'Approva gli esami',
            otherWaitLabel: "In attesa dell'approvazione esami",
        },
        {
            actorRole: 'office',
            at: src.closedAt,
            doneLabel: 'Application chiusa',
            selfTodoLabel: "Chiudi l'application",
            otherWaitLabel: 'In attesa della chiusura',
        },
    ];

    return defs.map((d, i): TimelineStep => {
        const done = i < current;
        const isCurrent = i === current;
        const rejected =
            isCurrent && (src.status === 'LA_REJECTED' || src.status === 'TOR_REJECTED');
        // In LA_CHANGE_SUBMITTED lo step corrente (Transcript) è in realtà una valutazione del docente.
        const isChange = isCurrent && src.status === 'LA_CHANGE_SUBMITTED';
        const actorRole: Role = isChange ? 'lecturer' : d.actorRole;
        const mine = actorRole === viewerRole;

        let state: StepState;
        if (done) state = 'done';
        else if (!isCurrent) state = 'future';
        else if (rejected) state = 'rejected';
        else state = mine ? 'action' : 'waiting';

        let note: string | undefined;
        if (isCurrent && src.status === 'LA_REJECTED' && lastRejectedLa?.evaluation?.reason) {
            note = 'Rifiutato dal docente: ' + lastRejectedLa.evaluation.reason;
        } else if (
            isCurrent &&
            src.status === 'TOR_REJECTED' &&
            lastRejectedTor?.evaluation?.reason
        ) {
            note = 'Transcript rifiutato: ' + lastRejectedTor.evaluation.reason;
        } else if (isChange) {
            note = 'Modifica al piano esami in valutazione';
        }

        let label: string;
        if (isChange) {
            label = mine
                ? 'Valuta la modifica al piano esami'
                : 'In attesa della valutazione della modifica';
        } else if (state === 'done') {
            label = d.doneLabel;
        } else if (state === 'action' || (state === 'rejected' && mine)) {
            label = d.selfTodoLabel;
        } else {
            label = d.otherWaitLabel;
        }

        return {
            id: 'tl' + i,
            label,
            state,
            actorRole,
            at: done ? d.at : null,
            by: done && d.at ? byFor(actorRole, viewerRole) : null,
            note,
        };
    });
}

/** DTO dettaglio -> VM completo (esami, documenti, modifiche, timeline). */
export function mapDetail(app: ApplicationDetail, viewerRole: Role): Application {
    return {
        id: 'APP-' + app.id,
        numericId: app.id,
        student: studentVM(app.student),
        lecturer: lecturerVM(app.lecturer),
        academicYear: app.academicYear,
        institution: institutionVM(app.institution),
        period: periodVM(app.expectedPeriod),
        phase: phaseOf(app.status),
        status: app.status,
        arrival: app.actualArrivalDate,
        departure: app.actualDepartureDate,
        exams: app.activeExamMappings.map(examVM),
        learningAgreements: app.learningAgreements.map((la) => ({
            id: la.id,
            version: la.versionNumber,
            fileName: la.originalName,
            at: la.uploadedAt,
            status: laStatus(la, app.status),
            reason: la.evaluation?.reason ?? null,
            isActive: la.isActive,
            changeDescription: la.changeDescription,
        })),
        transcripts: app.transcripts.map((t) => ({
            id: t.id,
            fileName: t.originalName,
            at: t.uploadedAt,
            status: torStatus(t.evaluation, t.isActive, app.status),
            reason: t.evaluation?.reason ?? null,
            isActive: t.isActive,
        })),
        modifications: app.learningAgreements
            .filter((la) => la.changeDescription)
            .map((la) => ({
                id: 'mod-' + la.id,
                description: la.changeDescription as string,
                at: la.uploadedAt,
                status: laStatus(la, app.status),
                reason: la.evaluation?.reason ?? null,
                laVersion: la.versionNumber,
            })),
        timeline: buildTimeline(app, viewerRole),
        activeLaId: app.learningAgreements.find((l) => l.isActive)?.id ?? null,
        activeTorId: app.transcripts.find((t) => t.isActive)?.id ?? null,
    };
}

/** DTO elenco -> VM leggero (basta a riga lista + badge azione, che dipende dallo stato). */
export function mapListItem(item: ApplicationListItem, viewerRole: Role): Application {
    return {
        id: 'APP-' + item.id,
        numericId: item.id,
        student: studentVM(item.student),
        lecturer: lecturerVM(item.lecturer),
        academicYear: item.academicYear,
        institution: institutionVM(item.institution),
        period: periodVM(item.expectedPeriod),
        phase: phaseOf(item.status),
        status: item.status,
        arrival: item.actualArrivalDate,
        departure: item.actualDepartureDate,
        exams: [],
        learningAgreements: [],
        transcripts: [],
        modifications: [],
        timeline: buildTimeline(item, viewerRole),
        activeLaId: null,
        activeTorId: null,
    };
}
