/* ===========================================================================
   Overseas Mobility — autenticazione (/api/v1/auth)
   Gestisce login, logout, ripristino sessione (token in localStorage) e
   l'utente corrente esposto come signal.
   =========================================================================== */
import { HttpClient } from '@angular/common/http';
import { computed, Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { Role } from './models';

export interface AuthUser {
    id: number;
    email: string;
    role: Role;
    firstName: string;
    lastName: string;
    matriculationNumber: string | null;
    createdAt: string;
}

const TOKEN_KEY = 'ovs_token'; // chiave usata in localStorage per salvare il token JWT

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly http = inject(HttpClient);

    readonly user = signal<AuthUser | null>(null);
    /** true mentre verifichiamo un token salvato all'avvio (evita il flash della login). */
    readonly bootstrapping = signal(false);
    readonly isAuthenticated = computed(() => this.user() !== null);

    get token(): string | null {
        return localStorage.getItem(TOKEN_KEY);
    }

    /** Chiamato all'avvio dell'app: se c'è un token, ricarica l'utente via /me. */
    bootstrap(): void {
        if (!this.token) return;
        this.bootstrapping.set(true);
        this.http.get<{ user: AuthUser }>('/api/v1/auth/me').subscribe({
            next: (r) => {
                this.user.set(r.user);
                this.bootstrapping.set(false);
            },
            error: () => {
                this.clearToken();
                this.user.set(null);
                this.bootstrapping.set(false);
            },
        });
    }

    login(email: string, password: string): Observable<AuthUser> {
        return this.http
            .post<{ user: AuthUser; token: string }>('/api/v1/auth/login', { email, password })
            .pipe(
                tap((r) => {
                    localStorage.setItem(TOKEN_KEY, r.token);
                    this.user.set(r.user);
                }),
                map((r) => r.user),
            );
    }

    logout(): void {
        this.clearToken();
        this.user.set(null);
    }

    private clearToken(): void {
        localStorage.removeItem(TOKEN_KEY);
    }
}
