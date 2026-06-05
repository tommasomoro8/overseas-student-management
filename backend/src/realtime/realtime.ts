import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

/**
 * Layer realtime "blando": il backend non spinge dati, si limita a segnalare ai
 * client che stanno guardando una specifica application che i suoi dati sono
 * cambiati. Ricevuta la segnalazione, il client ricarica il dettaglio via HTTP.
 */
let io: Server | null = null;

function roomFor(applicationId: number | string): string {
    return `app:${applicationId}`;
}

/** Inizializza socket.io sul server HTTP esistente e gestisce join/leave delle stanze. */
export function initRealtime(httpServer: HttpServer): Server {
    io = new Server(httpServer, {
        // Stesso criterio del CORS HTTP (cors() globale in app.ts): in dev si passa
        // comunque dal proxy del dev-server, quindi same-origin.
        cors: { origin: '*' },
    });

    io.on('connection', (socket: Socket) => {
        // Il client entra nella stanza della application aperta nel dettaglio.
        socket.on('join-application', (applicationId: number | string) => {
            socket.join(roomFor(applicationId));
        });
        socket.on('leave-application', (applicationId: number | string) => {
            socket.leave(roomFor(applicationId));
        });
    });

    return io;
}

/**
 * Segnala che una application e' stata aggiornata. I client nella sua stanza
 * ricaricheranno il dettaglio. `exceptSocketId` esclude l'autore dell'azione,
 * che ha gia' i dati aggiornati (evita doppio reload e notifiche superflue).
 */
export function notifyApplicationUpdated(
    applicationId: number | string,
    exceptSocketId?: string,
): void {
    if (!io) return;
    const room = roomFor(applicationId);
    const target = exceptSocketId ? io.to(room).except(exceptSocketId) : io.to(room);
    target.emit('application-updated', { applicationId: Number(applicationId) });
}

/**
 * Segnala che l'elenco delle application potrebbe essere cambiato (nuova pratica o
 * transizione di stato). I client in vista lista ricaricano il proprio elenco —
 * gia' filtrato per ruolo lato HTTP. Broadcast a tutti tranne l'autore dell'azione.
 */
export function notifyApplicationsChanged(exceptSocketId?: string): void {
    if (!io) return;
    const target = exceptSocketId ? io.except(exceptSocketId) : io;
    target.emit('applications-changed');
}
