/* ===========================================================================
   Overseas Mobility — app bar: utente autenticato + logout.
   Niente più selettore di ruolo: il ruolo è quello dell'utente loggato.
   =========================================================================== */
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService, AuthUser } from '../core/auth.service';
import { Role } from '../core/models';
import { BtnComponent } from '../ui/btn.component';
import { IconComponent } from '../ui/icon.component';

@Component({
    selector: 'app-appbar',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [IconComponent, BtnComponent],
    template: `
        <div class="appbar">
            <div class="brand">
                <span class="mark"><app-icon name="globe" [size]="17" /></span>
                Overseas Mobility
            </div>
            <div class="spacer"></div>
            @if (auth.user(); as u) {
                <div class="who">
                    <div class="avatar" [style.background]="color(u.role)">{{ initials(u) }}</div>
                    <div class="meta">
                        <div class="n">{{ u.firstName }} {{ u.lastName }}</div>
                        <div class="r">{{ roleLabel[u.role] }}</div>
                    </div>
                </div>
                <button
                    app-btn
                    variant="ghost"
                    size="sm"
                    icon="logout"
                    (click)="auth.logout()"
                    style="margin-left:14px"
                >
                    Esci
                </button>
            }
        </div>
    `,
})
export class AppbarComponent {
    readonly auth = inject(AuthService);

    readonly roleLabel: Record<Role, string> = {
        student: 'Studente',
        lecturer: 'Docente referente',
        office: 'Ufficio Overseas',
    };

    private readonly roleColor: Record<Role, string> = {
        student: 'oklch(0.54 0.16 256)',
        lecturer: 'oklch(0.6 0.13 150)',
        office: 'oklch(0.62 0.13 65)',
    };

    color(role: Role): string {
        return this.roleColor[role];
    }

    initials(u: AuthUser): string {
        return ((u.firstName[0] ?? '') + (u.lastName[0] ?? '')).toUpperCase();
    }
}
