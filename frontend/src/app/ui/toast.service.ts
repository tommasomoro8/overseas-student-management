/* ===========================================================================
   Overseas Mobility — toast host service
   =========================================================================== */
import { Injectable, signal } from '@angular/core';

export interface Toast {
    id: string;
    msg: string;
}

@Injectable({
    providedIn: 'root'
})
export class ToastService {
    readonly toasts = signal<Toast[]>([]);

    push(msg: string): void {
        const id = Math.random().toString(36).slice(2);
        this.toasts.update((t) => [...t, { id, msg }]); // t è la copia della lista di toast attuale, e ci aggiungo il nuovo toast
        setTimeout(() => {
            this.toasts.update((t) => t.filter((x) => x.id !== id)); // rimuove il toast dopo 2.8s (2800ms) filtrando la lista dei toast e tenendo solo quelli che non hanno l'id del toast da rimuovere
        }, 2800);
    }
}
