import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import apiRoutes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { realtimeNotifier } from './middlewares/realtime.middleware';

/**
 * Crea e configura l'applicazione Express.
 * Separata da server.ts per poterla riutilizzare (es. nei test) senza avviare il listener.
 */
export function createApp(): Application {
    const app = express();

    app.use(cors());
    app.use(express.json());

    // Endpoint di health-check.
    app.get('/health', (_req: Request, res: Response) => {
        res.json({ status: 'ok' });
    });

    // Notifica realtime dopo le mutazioni andate a buon fine (vedi realtime.middleware).
    app.use(realtimeNotifier);

    // API applicative.
    app.use('/api/v1', apiRoutes);

    // 404 + gestione errori.
    app.use(notFoundHandler);
    app.use(errorHandler);

    return app;
}
