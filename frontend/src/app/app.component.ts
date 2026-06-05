/* ===========================================================================
   Overseas Mobility — app shell + gate di autenticazione.
   - non autenticato  -> pagina di login
   - autenticato      -> shell + vista del ruolo (student/lecturer/office)
   Il routing interno è guidato dallo store (route); il ruolo deriva dall'utente.
   =========================================================================== */
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from './core/auth.service';
import { StoreService } from './core/store.service';
import { AppbarComponent } from './features/appbar.component';
import { CreateWizardComponent } from './features/create.component';
import { ApplicationDetailComponent } from './features/detail/application-detail.component';
import {
    LecturerListComponent,
    OfficeListComponent,
    StudentListComponent,
} from './features/lists.component';
import { LoginComponent } from './features/login.component';
import { IconComponent } from './ui/icon.component';
import { ToastHostComponent } from './ui/toast-host.component';

@Component({
    selector: 'app-root',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AppbarComponent,
        ToastHostComponent,
        CreateWizardComponent,
        ApplicationDetailComponent,
        StudentListComponent,
        LecturerListComponent,
        OfficeListComponent,
        LoginComponent,
        IconComponent,
    ],
    template: `
        @if (auth.bootstrapping()) {
            <div class="boot"><app-icon name="globe" [size]="26" /> Caricamento…</div>
        } @else if (!auth.isAuthenticated()) {
            <app-login />
        } @else {
            <div class="app">
                <app-appbar />
                @if (store.route().view === 'create') {
                    <app-create-wizard />
                } @else if (store.route().view === 'detail') {
                    @if (store.currentApp(); as a) {
                        <app-application-detail [app]="a" />
                    } @else if (store.detailLoading()) {
                        <div class="page"><div class="empty">Caricamento…</div></div>
                    } @else {
                        <div class="page">
                            <button class="linkback" (click)="store.back()">
                                <app-icon name="chevL" [size]="16" />Applications
                            </button>
                            <div class="empty">
                                {{ store.error() || 'Application non trovata.' }}
                            </div>
                        </div>
                    }
                } @else if (store.role() === 'student') {
                    <app-student-list />
                } @else if (store.role() === 'lecturer') {
                    <app-lecturer-list />
                } @else {
                    <app-office-list />
                }
            </div>
            <app-toast-host />
        }
    `,
})
export class AppComponent {
    readonly store = inject(StoreService);
    readonly auth = inject(AuthService);

    constructor() {
        // ripristina la sessione se c'è un token salvato
        this.auth.bootstrap();
    }
}
