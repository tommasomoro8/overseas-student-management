/* ===========================================================================
   Overseas Mobility — DEMO: configurazione dell'app.
   Sostituisce app.config.ts nella build "demo" (vedi angular.json):
   le chiamate HTTP finiscono nel backend simulato e il realtime è spento.
   =========================================================================== */
import { ApplicationConfig, Injectable, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from '@app/core/auth.interceptor';
import { RealtimeService } from '@app/core/realtime.service';
import { demoBackendInterceptor } from '@demo/demo-backend.interceptor';

// Se il browser blocca localStorage (es. pagina in un iframe senza permessi),
// il token dell'account demo vive in memoria: la demo funziona lo stesso.
try {
    window.localStorage.getItem('ovs_token');
} catch {
    const mem = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', {
        configurable: true,
        value: {
            getItem: (k: string) => mem.get(k) ?? null,
            setItem: (k: string, v: string) => void mem.set(k, String(v)),
            removeItem: (k: string) => void mem.delete(k),
        },
    });
}

/** Nella demo non c'è un server Socket.IO: un solo client, nessuna notifica da ricevere. */
@Injectable()
class DemoRealtimeService {
    socketId(): string | null {
        return null;
    }
    watchApplication(_applicationId: number, _onUpdate: () => void): () => void {
        return () => undefined;
    }
    watchList(_onChange: () => void): () => void {
        return () => undefined;
    }
}

export const appConfig: ApplicationConfig = {
    providers: [
        provideZoneChangeDetection({ eventCoalescing: true }),
        provideHttpClient(withInterceptors([authInterceptor, demoBackendInterceptor])),
        { provide: RealtimeService, useClass: DemoRealtimeService },
    ],
};
