/* ===========================================================================
   Overseas Mobility — realtime "blando" via socket.io.
   Non riceve dati dal server: ascolta solo la segnalazione "application-updated"
   per la pratica aperta e lascia che lo store ricarichi il dettaglio via HTTP.
   =========================================================================== */
import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';

@Injectable({ providedIn: 'root' })
export class RealtimeService {
    private socket: Socket | null = null;

    /** Connessione lazy, same-origin: il proxy del dev-server inoltra /socket.io al backend. */
    private ensure(): Socket {
        if (!this.socket) {
            this.socket = io({ autoConnect: true });
        }
        return this.socket;
    }

    /** Id del socket corrente: inviato nelle richieste HTTP per escludersi dalle proprie notifiche. */
    socketId(): string | null {
        return this.socket?.id ?? null;
    }

    /**
     * Ascolta gli aggiornamenti di una specifica application.
     * Ritorna una funzione di cleanup che lascia la stanza e rimuove i listener.
     */
    watchApplication(applicationId: number, onUpdate: () => void): () => void {
        const socket = this.ensure();

        const join = () => socket.emit('join-application', applicationId);
        if (socket.connected) join();
        socket.on('connect', join); // re-join automatico dopo eventuali riconnessioni

        const handler = (payload: { applicationId: number }) => {
            if (payload?.applicationId === applicationId) onUpdate();
        };
        socket.on('application-updated', handler);

        return () => {
            socket.emit('leave-application', applicationId);
            socket.off('application-updated', handler);
            socket.off('connect', join);
        };
    }

    /**
     * Ascolta i cambiamenti dell'elenco (nuova pratica o transizione di stato),
     * cosi' la lista resta aggiornata senza ricaricare la pagina.
     * Ritorna una funzione di cleanup che rimuove il listener.
     */
    watchList(onChange: () => void): () => void {
        const socket = this.ensure();
        socket.on('applications-changed', onChange);
        return () => socket.off('applications-changed', onChange);
    }
}
