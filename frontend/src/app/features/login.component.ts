/* ===========================================================================
   Overseas Mobility — pagina di login (mostrata quando non autenticati)
   =========================================================================== */
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../core/auth.service';
import { StoreService } from '../core/store.service';
import { BtnComponent } from '../ui/btn.component';
import { IconComponent } from '../ui/icon.component';

@Component({
    selector: 'app-login',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, BtnComponent, IconComponent],
    template: `
        <div class="login-wrap">
            <div class="login-box">
                <div class="login-brand">
                    <span class="mark"><app-icon name="globe" [size]="19" /></span>
                    Overseas
                </div>
                <div class="card card-pad">
                    <h1 class="login-title">Accedi</h1>
                    <div class="login-sub">Programma di mobilità Overseas · Ca' Foscari</div>

                    <form (ngSubmit)="submit()">
                        <div class="field">
                            <label>Email</label>
                            <input
                                class="inp"
                                type="email"
                                name="email"
                                [(ngModel)]="email"
                                placeholder="nome@cafoscari.it"
                                autocomplete="username"
                                autofocus
                            />
                        </div>
                        <div class="field" style="margin-bottom:0">
                            <label>Password</label>
                            <input
                                class="inp"
                                type="password"
                                name="password"
                                [(ngModel)]="password"
                                placeholder="••••••••"
                                autocomplete="current-password"
                            />
                        </div>

                        @if (error) {
                            <div class="note red" style="margin-top:16px">{{ error }}</div>
                        }

                        <button
                            app-btn
                            variant="primary"
                            type="submit"
                            class="block"
                            style="width:100%;margin-top:18px"
                            [disabled]="loading || !email.trim() || !password"
                        >
                            {{ loading ? 'Accesso in corso…' : 'Accedi' }}
                        </button>
                    </form>

                    <div class="login-hint">
                        Utenti demo (password <code>Ciao1234!</code>):<br />
                        studente&#64;cafoscari.it · docente&#64;cafoscari.it ·
                        office&#64;cafoscari.it
                    </div>
                </div>
            </div>
        </div>
    `,
})
export class LoginComponent {
    private readonly auth = inject(AuthService);
    private readonly store = inject(StoreService);

    email = '';
    password = '';
    loading = false;
    error = '';

    submit(): void {
        if (this.loading || !this.email.trim() || !this.password) return;
        this.loading = true;
        this.error = '';
        this.auth.login(this.email.trim(), this.password).subscribe({
            next: () => {
                this.loading = false;
                // riparti sempre dalla lista del ruolo appena autenticato
                this.store.go('list');
            },
            error: (err: unknown) => {
                this.loading = false;
                this.error =
                    err instanceof HttpErrorResponse && err.status === 401
                        ? 'Credenziali non valide.'
                        : 'Errore di connessione al server. Riprova.';
            },
        });
    }
}
