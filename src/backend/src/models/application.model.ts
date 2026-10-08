import { PoolClient } from 'pg';
import { query } from '../config/db';
import { ApplicationStatus, MobilityPeriod } from '../types/application.types';

/** Riga della tabella "applications" cosi' come restituita da PostgreSQL (snake_case). */
export interface ApplicationRow {
    id: number;
    student_id: number;
    referent_lecturer_id: number;
    host_institution_id: number;
    academic_year: string;
    expected_period: MobilityPeriod;
    status: ApplicationStatus;
    actual_arrival_date: string | null;
    actual_departure_date: string | null;
    mobility_dates_inserted_at: Date | null;
    pre_departure_approved_at: Date | null;
    closed_at: Date | null;
    created_at: Date;
    updated_at: Date;
}

/** Dati per creare una nuova domanda (camelCase). */
export interface CreateApplicationInput {
    studentId: number;
    referentLecturerId: number;
    hostInstitutionId: number;
    academicYear: string;
    expectedPeriod: MobilityPeriod;
}

/** Inserisce una nuova domanda (stato iniziale DRAFT) e restituisce la riga creata. */
export async function createApplication(input: CreateApplicationInput): Promise<ApplicationRow> {
    const result = await query<ApplicationRow>(
        `INSERT INTO applications
            (student_id, referent_lecturer_id, host_institution_id, academic_year, expected_period)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
            input.studentId,
            input.referentLecturerId,
            input.hostInstitutionId,
            input.academicYear,
            input.expectedPeriod,
        ],
    );
    const application = result.rows[0];
    if (!application) {
        throw new Error('Inserimento domanda non riuscito');
    }
    return application;
}

/** Cerca una domanda per id. */
export async function findApplicationById(id: number): Promise<ApplicationRow | undefined> {
    const result = await query<ApplicationRow>('SELECT * FROM applications WHERE id = $1', [id]);
    return result.rows[0];
}

/** Variante dentro transazione: blocca la riga (FOR UPDATE) per serializzare le transizioni. */
export async function findApplicationByIdForUpdate(
    client: PoolClient,
    id: number,
): Promise<ApplicationRow | undefined> {
    const result = await client.query<ApplicationRow>(
        'SELECT * FROM applications WHERE id = $1 FOR UPDATE',
        [id],
    );
    return result.rows[0];
}

/** Domande dello studente indicato (filtro opzionale per stato), piu' recenti prima. */
export async function listApplicationsForStudent(
    studentId: number,
    status: ApplicationStatus | null,
): Promise<ApplicationRow[]> {
    if (status) {
        const result = await query<ApplicationRow>(
            'SELECT * FROM applications WHERE student_id = $1 AND status = $2 ORDER BY created_at DESC',
            [studentId, status],
        );
        return result.rows;
    }
    const result = await query<ApplicationRow>(
        'SELECT * FROM applications WHERE student_id = $1 ORDER BY created_at DESC',
        [studentId],
    );
    return result.rows;
}

/** Domande in cui il docente indicato e' referente (filtro opzionale per stato). */
export async function listApplicationsForLecturer(
    lecturerId: number,
    status: ApplicationStatus | null,
): Promise<ApplicationRow[]> {
    if (status) {
        const result = await query<ApplicationRow>(
            'SELECT * FROM applications WHERE referent_lecturer_id = $1 AND status = $2 ORDER BY created_at DESC',
            [lecturerId, status],
        );
        return result.rows;
    }
    const result = await query<ApplicationRow>(
        'SELECT * FROM applications WHERE referent_lecturer_id = $1 ORDER BY created_at DESC',
        [lecturerId],
    );
    return result.rows;
}

/** Tutte le domande (usata dall'ufficio), filtro opzionale per stato. */
export async function listAllApplications(
    status: ApplicationStatus | null,
): Promise<ApplicationRow[]> {
    if (status) {
        const result = await query<ApplicationRow>(
            'SELECT * FROM applications WHERE status = $1 ORDER BY created_at DESC',
            [status],
        );
        return result.rows;
    }
    const result = await query<ApplicationRow>(
        'SELECT * FROM applications ORDER BY created_at DESC',
    );
    return result.rows;
}

/** Aggiorna solo lo stato (dentro transazione). Usata da upload/valutazione documenti. */
export async function setApplicationStatus(
    client: PoolClient,
    id: number,
    status: ApplicationStatus,
): Promise<ApplicationRow> {
    const result = await client.query<ApplicationRow>(
        'UPDATE applications SET status = $1, updated_at = now() WHERE id = $2 RETURNING *',
        [status, id],
    );
    const application = result.rows[0];
    if (!application) {
        throw new Error('Aggiornamento stato domanda non riuscito');
    }
    return application;
}

/** Approvazione pre-partenza dell'ufficio: stato + timestamp dedicato. */
export async function markPreDepartureApproved(
    client: PoolClient,
    id: number,
): Promise<ApplicationRow> {
    const result = await client.query<ApplicationRow>(
        `UPDATE applications
         SET status = 'PRE_DEPARTURE_APPROVED', pre_departure_approved_at = now(), updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [id],
    );
    const application = result.rows[0];
    if (!application) {
        throw new Error('Aggiornamento domanda non riuscito');
    }
    return application;
}

/** Chiusura definitiva da parte dell'ufficio: stato + timestamp dedicato. */
export async function markClosed(client: PoolClient, id: number): Promise<ApplicationRow> {
    const result = await client.query<ApplicationRow>(
        `UPDATE applications
         SET status = 'CLOSED', closed_at = now(), updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [id],
    );
    const application = result.rows[0];
    if (!application) {
        throw new Error('Aggiornamento domanda non riuscito');
    }
    return application;
}

/**
 * Ingresso in mobilita': registra per la prima volta le date effettive, valorizza
 * mobility_dates_inserted_at e porta la domanda in MOBILITY_IN_PROGRESS.
 */
export async function enterMobilityInProgress(
    client: PoolClient,
    id: number,
    arrivalDate: string,
    departureDate: string,
): Promise<ApplicationRow> {
    const result = await client.query<ApplicationRow>(
        `UPDATE applications
         SET status = 'MOBILITY_IN_PROGRESS',
             actual_arrival_date = $1,
             actual_departure_date = $2,
             mobility_dates_inserted_at = now(),
             updated_at = now()
         WHERE id = $3
         RETURNING *`,
        [arrivalDate, departureDate, id],
    );
    const application = result.rows[0];
    if (!application) {
        throw new Error('Avvio della mobilita' + ' non riuscito');
    }
    return application;
}

/**
 * Correzione delle date effettive durante la mobilita' (es. data di rientro reale).
 * NON cambia lo stato ne' mobility_dates_inserted_at (resta la data del primo inserimento).
 */
export async function updateMobilityDates(
    client: PoolClient,
    id: number,
    arrivalDate: string,
    departureDate: string,
): Promise<ApplicationRow> {
    const result = await client.query<ApplicationRow>(
        `UPDATE applications
         SET actual_arrival_date = $1,
             actual_departure_date = $2,
             updated_at = now()
         WHERE id = $3
         RETURNING *`,
        [arrivalDate, departureDate, id],
    );
    const application = result.rows[0];
    if (!application) {
        throw new Error('Aggiornamento date di mobilita' + ' non riuscito');
    }
    return application;
}
