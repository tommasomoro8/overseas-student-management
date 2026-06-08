import http from 'http';
import { env } from './config/env';
import { pool } from './config/db';
import { createApp } from './app';
import { initDb } from './db/schema';
import { seedDatabase } from './db/seed';
import { backfillInstitutionFlags } from './models/institution.model';
import { initRealtime } from './realtime/realtime';

/**
 * Punto di ingresso del backend.
 * 1. Inizializza lo schema del database.
 * 2. (Opzionale) precarica gli utenti di test.
 * 3. Avvia il server Express.
 */
async function startServer(): Promise<void> {
    try {
        await initDb();
        
        // Popola la bandiera per le istituzioni preesistenti (idempotente).
        await backfillInstitutionFlags();

        if (env.SEED) await seedDatabase();

        const app = createApp();
        // Server HTTP esplicito per condividere la porta tra Express e socket.io.
        const httpServer = http.createServer(app);
        initRealtime(httpServer);
        httpServer.listen(env.PORT, () => {
            console.log(`[server] In ascolto sulla porta ${env.PORT} (NODE_ENV=${env.NODE_ENV})`);
        });
    } catch (err) {
        console.error('[server] Avvio fallito:', err);
        await pool.end().catch(() => undefined);
        process.exit(1);
    }
}

(async () => await startServer())();
