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

    console.log('[db] Schema inizializzato');
}
