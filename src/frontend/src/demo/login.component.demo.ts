/* ===========================================================================
   Overseas Mobility — DEMO: scelta dell'account al posto della login.
   Sostituisce login.component.ts nella build "demo" (vedi angular.json).
   Il logout riporta a questa schermata.
   =========================================================================== */
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ApiRole } from '@app/core/api.types';
import { AuthService } from '@app/core/auth.service';
import { StoreService } from '@app/core/store.service';
import { IconComponent } from '@app/ui/icon.component';
import { demoLogin } from '@demo/demo-backend.interceptor';

const TOKEN_KEY = 'ovs_token'; // stessa chiave di AuthService

@Component({
    selector: 'app-login',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [IconComponent],
    template: `
        <div class="login-wrap">
            <div class="login-box">
                <div class="login-brand">
                    <span class="mark"><app-icon name="globe" [size]="19" /></span>
                    Overseas Mobility
                </div>
                <div class="card card-pad">
                    <h1 class="login-title">Demo</h1>
                    <div class="login-sub">Scegli con quale account entrare</div>

                    @for (a of accounts; track a.role) {
                        <button type="button" class="demo-account" (click)="enter(a.role)">
                            <span class="demo-ic"><app-icon [name]="a.icon" [size]="20" /></span>
                            <span class="demo-txt">
                                <span class="demo-role">{{ a.label }}</span>
                                <span class="demo-desc">{{ a.desc }}</span>
                            </span>
                            <app-icon name="chevR" [size]="18" />
                        </button>
                    }

                    <div class="login-hint">
                        Dati fittizi, salvati solo in questa pagina:<br />
                        ricaricandola si riparte da zero.
                    </div>
                </div>
            </div>
        </div>
    `,
    styles: `
        .demo-account {
            display: flex;
            align-items: center;
            gap: 14px;
            width: 100%;
            padding: 14px 16px;
            margin-bottom: 10px;
            border: 1px solid var(--border);
            border-radius: 12px;
            background: var(--surface);
            color: var(--text);
            font: inherit;
            text-align: left;
            cursor: pointer;
        }
        .demo-account:hover {
            border-color: var(--primary);
        }
        .demo-ic {
            display: grid;
            place-items: center;
            width: 40px;
            height: 40px;
            border-radius: 10px;
            background: var(--surface-3);
            color: var(--primary);
            flex: none;
        }
        .demo-txt {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
        .demo-role {
            font-weight: 700;
        }
        .demo-desc {
            font-size: 12.5px;
            color: var(--text-2);
        }
    `,
})
export class LoginComponent {
    private readonly auth = inject(AuthService);
    private readonly store = inject(StoreService);

    readonly accounts: { role: ApiRole; icon: string; label: string; desc: string }[] = [
        {
            role: 'student',
            icon: 'grad',
            label: 'Studente',
            desc: 'Marco Rossi · crea domande e carica i documenti',
        },
        {
            role: 'lecturer',
            icon: 'book',
            label: 'Docente referente',
            desc: 'Laura Bianchi · valuta Learning Agreement e Transcript',
        },
        {
            role: 'office',
            icon: 'inbox',
            label: 'Ufficio Overseas',
            desc: 'Giulia Verdi · verifica la pre-partenza e chiude le pratiche',
        },
    ];

    enter(role: ApiRole): void {
        const { user, token } = demoLogin(role);
        localStorage.setItem(TOKEN_KEY, token);
        this.auth.user.set(user);
        // come dopo il login: si riparte dalla lista del ruolo
        this.store.go('list');
    }
}
