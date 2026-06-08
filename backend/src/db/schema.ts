import { pool } from '../config/db';

/**
 * Crea (se non esistono) i tipi e le tabelle necessari all'applicazione.
 * E' idempotente: puo' essere eseguita ad ogni avvio senza effetti collaterali.
 */
export async function initDb(): Promise<void> {
    // Tipo enumerato per il ruolo. CREATE TYPE non supporta IF NOT EXISTS,
    // quindi lo avvolgiamo in un blocco che ignora l'errore "gia' esistente".
    await pool.query(`
        DO $$ BEGIN
            CREATE TYPE user_role AS ENUM ('student', 'lecturer', 'office');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id                    SERIAL PRIMARY KEY,
            email                 VARCHAR(255) UNIQUE NOT NULL,
            password_hash         VARCHAR(255) NOT NULL,
            role                  user_role NOT NULL DEFAULT 'student',
            first_name            VARCHAR(100) NOT NULL,
            last_name             VARCHAR(100) NOT NULL,
            matriculation_number  VARCHAR(20),
            created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    `);

    // --- ENUM applicativi del modulo mobilita' ---
    await pool.query(`
        DO $$ BEGIN
            CREATE TYPE application_status AS ENUM (
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
                'CLOSED'
            );
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
    `);

    await pool.query(`
        DO $$ BEGIN
            CREATE TYPE evaluation_decision AS ENUM ('APPROVED', 'REJECTED');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
    `);

    await pool.query(`
        DO $$ BEGIN
            CREATE TYPE mobility_period AS ENUM ('FIRST_SEMESTER', 'SECOND_SEMESTER', 'FULL_YEAR');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
    `);

    // --- Istituzioni ospitanti ---
    await pool.query(`
        CREATE TABLE IF NOT EXISTS institutions (
            id            SERIAL PRIMARY KEY,
            name          VARCHAR(255) NOT NULL,
            country       VARCHAR(100) NOT NULL,
            city          VARCHAR(100) NOT NULL,
            erasmus_code  VARCHAR(50) UNIQUE NOT NULL,
            flag          VARCHAR(10),
            created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    `);

    // --- Domande di mobilita' ---
    await pool.query(`
        CREATE TABLE IF NOT EXISTS applications (
            id                          SERIAL PRIMARY KEY,
            student_id                  INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
            referent_lecturer_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
            host_institution_id         INTEGER NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
            academic_year               VARCHAR(9) NOT NULL,
            expected_period             mobility_period NOT NULL,
            status                      application_status NOT NULL DEFAULT 'DRAFT',
            actual_arrival_date         DATE,
            actual_departure_date       DATE,
            mobility_dates_inserted_at  TIMESTAMPTZ,
            pre_departure_approved_at   TIMESTAMPTZ,
            closed_at                   TIMESTAMPTZ,
            created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    `);

    await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_applications_student  ON applications(student_id);`,
    );
    await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_applications_referent ON applications(referent_lecturer_id);`,
    );
    await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_applications_status   ON applications(status);`,
    );
    await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_applications_inst     ON applications(host_institution_id);`,
    );

    // --- Learning Agreement (versionati: ogni riga e' una versione del documento: file + mapping) ---
    // change_description e' valorizzata solo per le modifiche proposte durante la mobilita' (Step 2).
    await pool.query(`
        CREATE TABLE IF NOT EXISTS learning_agreements (
            id                 SERIAL PRIMARY KEY,
            application_id      INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
            file_url           VARCHAR(512) NOT NULL,
            original_name      VARCHAR(255) NOT NULL,
            version_number     INTEGER NOT NULL,
            is_active          BOOLEAN NOT NULL DEFAULT true,
            change_description TEXT,
            uploaded_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT uq_la_app_version UNIQUE (application_id, version_number)
        );
    `);
    // Una sola versione attiva per domanda (indice univoco parziale).
    await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_la_one_active
            ON learning_agreements(application_id)
            WHERE is_active;
    `);

    // --- Valutazioni del Learning Agreement (legate alla singola versione) ---
    // reason: motivazione/nota della decisione (obbligatoria solo in caso di rifiuto).
    await pool.query(`
        CREATE TABLE IF NOT EXISTS learning_agreement_evaluations (
            id                     SERIAL PRIMARY KEY,
            learning_agreement_id  INTEGER NOT NULL REFERENCES learning_agreements(id) ON DELETE CASCADE,
            lecturer_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
            decision               evaluation_decision NOT NULL,
            reason                 TEXT,
            evaluated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    `);
    await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_la_eval_la ON learning_agreement_evaluations(learning_agreement_id);`,
    );

    // --- Transcript of Records (versionati, stessa logica del Learning Agreement) ---
    await pool.query(`
        CREATE TABLE IF NOT EXISTS transcript_of_records (
            id              SERIAL PRIMARY KEY,
            application_id  INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
            file_url        VARCHAR(512) NOT NULL,
            original_name   VARCHAR(255) NOT NULL,
            version_number  INTEGER NOT NULL,
            is_active       BOOLEAN NOT NULL DEFAULT true,
            uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT uq_tor_app_version UNIQUE (application_id, version_number)
        );
    `);
    await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_tor_one_active
            ON transcript_of_records(application_id)
            WHERE is_active;
    `);

    // --- Mapping esami estero <-> casa (snapshot per versione del Learning Agreement) ---
    // Le righe appartengono alla VERSIONE del LA (learning_agreement_id), non alla
    // domanda: cosi' il ripristino su rifiuto di una modifica e' un semplice toggle di
    // is_active fra versioni. score/exam_date sono compilati al rientro (fase ToR).
    await pool.query(`
        CREATE TABLE IF NOT EXISTS exam_mappings (
            id                    SERIAL PRIMARY KEY,
            learning_agreement_id INTEGER NOT NULL REFERENCES learning_agreements(id) ON DELETE CASCADE,
            foreign_code          VARCHAR(50) NOT NULL,
            foreign_title         VARCHAR(255) NOT NULL,
            foreign_credits       NUMERIC(5,2) NOT NULL,
            home_code             VARCHAR(50) NOT NULL,
            home_title            VARCHAR(255) NOT NULL,
            home_credits          NUMERIC(5,2) NOT NULL,
            score                 VARCHAR(20),
            exam_date             DATE,
            created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    `);
    await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_exam_mappings_la ON exam_mappings(learning_agreement_id);`,
    );

    // --- Valutazioni del Transcript of Records (legate alla singola versione) ---
    // reason: motivazione/nota della decisione (obbligatoria solo in caso di rifiuto).
    await pool.query(`
        CREATE TABLE IF NOT EXISTS transcript_of_record_evaluations (
            id               SERIAL PRIMARY KEY,
            transcript_id    INTEGER NOT NULL REFERENCES transcript_of_records(id) ON DELETE CASCADE,
            lecturer_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
            decision         evaluation_decision NOT NULL,
            reason           TEXT,
            evaluated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    `);
    await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_tor_eval_tor ON transcript_of_record_evaluations(transcript_id);`,
    );

    console.log('[db] Schema inizializzato');
}
