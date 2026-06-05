import { AppError } from '../utils/AppError';

/**
 * Stato del ciclo di vita di una domanda di mobilita'.
 * Mirror dell'ENUM Postgres "application_status": i due valori devono restare allineati.
 */
export type ApplicationStatus =
    | 'DRAFT'
    | 'LA_SUBMITTED'
    | 'LA_APPROVED'
    | 'LA_REJECTED'
    | 'PRE_DEPARTURE_APPROVED'
    | 'MOBILITY_IN_PROGRESS'
    | 'LA_CHANGE_SUBMITTED'
    | 'TOR_SUBMITTED'
    | 'TOR_APPROVED'
    | 'TOR_REJECTED'
    | 'CLOSED';

/** Esito di una valutazione (mirror dell'ENUM Postgres "evaluation_decision"). */
export type EvaluationDecision = 'APPROVED' | 'REJECTED';

/**
 * Periodo di mobilita' previsto al momento della domanda.
 * Mirror dell'ENUM Postgres "mobility_period": i valori devono restare allineati.
 * Unica fonte di verita': il type e' derivato dall'array, cosi' validazione (Zod)
 * e tipi non possono divergere.
 */
export const MOBILITY_PERIODS = ['FIRST_SEMESTER', 'SECOND_SEMESTER', 'FULL_YEAR'] as const;
export type MobilityPeriod = (typeof MOBILITY_PERIODS)[number];

/** Tutti gli stati ammessi, utile per validazione di query string (?status=...). */
export const APPLICATION_STATUSES: readonly ApplicationStatus[] = [
    'DRAFT',
    'LA_SUBMITTED',
    'LA_APPROVED',
    'LA_REJECTED',
    'PRE_DEPARTURE_APPROVED',
    'MOBILITY_IN_PROGRESS',
    'LA_CHANGE_SUBMITTED',
    'TOR_SUBMITTED',
    'TOR_APPROVED',
    'TOR_REJECTED',
    'CLOSED',
];

/**
 * Macchina a stati: per ogni stato, l'insieme degli stati di destinazione leciti.
 * Una transizione non presente qui e' illegale e va respinta con 409.
 */
export const ALLOWED_TRANSITIONS: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
    DRAFT: ['LA_SUBMITTED'],
    LA_SUBMITTED: ['LA_APPROVED', 'LA_REJECTED'],
    LA_REJECTED: ['LA_SUBMITTED'],
    LA_APPROVED: ['PRE_DEPARTURE_APPROVED'],
    // Pre-partenza completata: la mobilita' inizia solo quando lo studente registra
    // le date effettive di arrivo/partenza (unica transizione possibile da qui).
    PRE_DEPARTURE_APPROVED: ['MOBILITY_IN_PROGRESS'],
    // Mobilita' in corso: lo studente puo' proporre una modifica al LA/mapping
    // oppure, al rientro, procedere al caricamento del Transcript.
    MOBILITY_IN_PROGRESS: ['LA_CHANGE_SUBMITTED', 'TOR_SUBMITTED'],
    // Esito di una modifica: sia approvazione che rifiuto riportano in mobilita'
    // (il rifiuto in piu' ripristina la versione precedente di LA e mapping).
    LA_CHANGE_SUBMITTED: ['MOBILITY_IN_PROGRESS'],
    TOR_SUBMITTED: ['TOR_APPROVED', 'TOR_REJECTED'],
    TOR_REJECTED: ['TOR_SUBMITTED'],
    TOR_APPROVED: ['CLOSED'],
    CLOSED: [],
};

/**
 * Verifica che la transizione from -> to sia consentita dalla macchina a stati.
 * Lancia AppError(409) altrimenti. Va chiamata DENTRO la transazione, dopo aver
 * riletto lo stato corrente (SELECT ... FOR UPDATE) per evitare race condition.
 */
export function assertTransition(from: ApplicationStatus, to: ApplicationStatus): void {
    if (!ALLOWED_TRANSITIONS[from].includes(to)) {
        throw new AppError(409, `Transizione di stato non consentita: ${from} -> ${to}`, {
            from,
            to,
            allowed: ALLOWED_TRANSITIONS[from],
        });
    }
}
