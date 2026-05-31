import { env } from './config/env';
import { pool } from './config/db';
import { createApp } from './app';
import { initDb } from './db/schema';
import { seedDatabase } from './db/seed';

/**
 * Punto di ingresso del backend.
 * 1. Inizializza lo schema del database.
 * 2. (Opzionale) precarica gli utenti di test.
 * 3. Avvia il server Express.
 */
async function startServer(): Promise<void> {
    try {
        await initDb();

        if (env.SEED) await seedDatabase();

        const app = createApp();
        app.listen(env.PORT, () => {
            console.log(`[server] In ascolto sulla porta ${env.PORT} (NODE_ENV=${env.NODE_ENV})`);
        });
    } catch (err) {
        console.error('[server] Avvio fallito:', err);
        await pool.end().catch(() => undefined); // chiude la connessione al database in caso di errore, lo ignora
        process.exit(1); // esce con codice di errore
    }
}

(async () => await startServer())();
