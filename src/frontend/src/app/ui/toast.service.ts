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
        this.toasts.update((t) => [...t, { id, msg }]);
        setTimeout(() => {
            this.toasts.update((t) => t.filter((x) => x.id !== id));
        }, 2800);
    }
}
