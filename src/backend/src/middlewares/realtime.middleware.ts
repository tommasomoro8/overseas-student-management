import { NextFunction, Request, Response } from 'express';
import { notifyApplicationUpdated, notifyApplicationsChanged } from '../realtime/realtime';

/**
 * Dopo ogni mutazione andata a buon fine su una application, notifica i client:
 * - chi guarda quella pratica nel dettaglio (stanza app:<id>);
 * - chi e' nella lista (broadcast generico, ad es. nuova pratica creata).
 * L'id e' ricavato dall'URL (/applications/:id/...), quindi copre LA, transcript,
 * date, pre-partenza e chiusura senza toccare i singoli controller. La creazione
 * (POST /applications, senza id) aggiorna comunque la lista. Il mittente e' escluso
 * tramite l'header X-Socket-Id.
 */
export function realtimeNotifier(req: Request, res: Response, next: NextFunction): void {
    res.on('finish', () => { // scatta dopo che il controller ha scritto la risposta, quindi conosciamo status e URL finale
        if (req.method === 'GET') return;
        if (res.statusCode < 200 || res.statusCode >= 300) return;
        if (!req.originalUrl.includes('/applications')) return;

        const socketId = req.header('x-socket-id') || undefined;
        const applicationId = req.originalUrl.match(/\/applications\/(\d+)/)?.[1];

        if (applicationId) notifyApplicationUpdated(applicationId, socketId);
        
        notifyApplicationsChanged(socketId);
    });
    next();
}
