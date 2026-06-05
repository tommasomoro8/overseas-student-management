/* ===========================================================================
   Overseas Mobility — etichette e derivazioni (pure) allineate al backend.
   Le azioni/stato derivano dallo STATO della domanda (enum backend), non da dati mock.
   =========================================================================== */
import { ActionStatus, Application, Phase, Role, Status } from './models';

export const PHASE_LABEL: Record<Phase, string> = {
    'pre-departure': 'Pre-partenza',
    'during-mobility': 'Durante la mobilità',
    'after-returning': 'Dopo il rientro',
    concluded: 'Conclusa',
};

export const STATUS_LABEL: Record<Status, string> = {
    DRAFT: 'Bozza',
    LA_SUBMITTED: 'Learning Agreement in valutazione',
    LA_APPROVED: 'Learning Agreement approvato',
    LA_REJECTED: 'Learning Agreement rifiutato',
    PRE_DEPARTURE_APPROVED: 'Pre-partenza approvata',
    MOBILITY_IN_PROGRESS: 'Mobilità in corso',
    LA_CHANGE_SUBMITTED: 'Modifica in valutazione',
    TOR_SUBMITTED: 'Transcript in valutazione',
    TOR_APPROVED: 'Esami approvati',
    TOR_REJECTED: 'Transcript rifiutato',
    CLOSED: 'Conclusa',
};

/** Fase UI (4 macro-fasi) derivata dallo stato puntuale del backend. */
export function phaseOf(status: Status): Phase {
    switch (status) {
        case 'DRAFT':
        case 'LA_SUBMITTED':
        case 'LA_APPROVED':
        case 'LA_REJECTED':
        case 'PRE_DEPARTURE_APPROVED':
            return 'pre-departure';
        case 'MOBILITY_IN_PROGRESS':
        case 'LA_CHANGE_SUBMITTED':
            return 'during-mobility';
        case 'TOR_SUBMITTED':
        case 'TOR_APPROVED':
        case 'TOR_REJECTED':
            return 'after-returning';
        case 'CLOSED':
            return 'concluded';
    }
}

/**
 * Stato-azione per ruolo, derivato unicamente dallo stato della domanda
 * (rispecchia la macchina a stati del backend).
 */
export function actionStatus(app: Application, role: Role): ActionStatus {
    const s = app.status;
    if (role === 'student') {
        switch (s) {
            case 'DRAFT':
                return { kind: 'todo', label: 'Carica il Learning Agreement' };
            case 'LA_REJECTED':
                return { kind: 'todo', label: 'Ricarica il Learning Agreement' };
            case 'LA_SUBMITTED':
                return { kind: 'waiting', label: 'Attendi la valutazione del docente' };
            case 'LA_APPROVED':
                return { kind: 'waiting', label: "Attendi la verifica dell'ufficio" };
            case 'PRE_DEPARTURE_APPROVED':
                return { kind: 'todo', label: 'Inserisci le date di mobilità' };
            case 'MOBILITY_IN_PROGRESS':
                return { kind: 'todo', label: 'Carica il Transcript o proponi una modifica' };
            case 'LA_CHANGE_SUBMITTED':
                return { kind: 'waiting', label: 'Modifica in valutazione' };
            case 'TOR_SUBMITTED':
                return { kind: 'waiting', label: 'Attendi la valutazione degli esami' };
            case 'TOR_REJECTED':
                return { kind: 'todo', label: 'Ricarica il Transcript' };
            case 'TOR_APPROVED':
                return { kind: 'waiting', label: "Attendi la chiusura dell'ufficio" };
            case 'CLOSED':
                return { kind: 'none', label: 'Nessuna azione richiesta' };
        }
    }
    if (role === 'lecturer') {
        switch (s) {
            case 'LA_SUBMITTED':
                return { kind: 'todo', label: 'Valuta il Learning Agreement' };
            case 'LA_CHANGE_SUBMITTED':
                return { kind: 'todo', label: 'Valuta la modifica proposta' };
            case 'TOR_SUBMITTED':
                return { kind: 'todo', label: 'Approva esami e voti' };
            default:
                return { kind: 'none', label: 'Nessuna azione richiesta' };
        }
    }
    // office
    switch (s) {
        case 'LA_APPROVED':
            return { kind: 'todo', label: 'Verifica la pre-partenza' };
        case 'TOR_APPROVED':
            return { kind: 'todo', label: "Chiudi l'application" };
        default:
            return { kind: 'none', label: 'Nessuna azione richiesta' };
    }
}

const MONTHS = [
    'gennaio',
    'febbraio',
    'marzo',
    'aprile',
    'maggio',
    'giugno',
    'luglio',
    'agosto',
    'settembre',
    'ottobre',
    'novembre',
    'dicembre',
];

export function fmtDate(iso: string | null | undefined, withTime = false): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    const base = d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
    if (!withTime) return base;
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return base + ', ' + hh + ':' + mm;
}
