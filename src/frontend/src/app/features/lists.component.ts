/* ===========================================================================
   Overseas Mobility — schermate elenco per ruolo (dati reali dal backend).
   Il backend filtra già per ruolo (studente: proprie; docente: come referente;
   ufficio: tutte). I filtri lato client (docente/ufficio) servono solo a
   restringere l'elenco gia' ricevuto: "da gestire" (azione richiesta) o per fase.
   =========================================================================== */
import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { Application } from '../core/models';
import { actionStatus, PHASE_LABEL } from '../core/ovs-data';
import { StoreService } from '../core/store.service';
import { ActionBadgeComponent } from '../ui/badge.component';
import { BtnComponent } from '../ui/btn.component';
import { IconComponent } from '../ui/icon.component';

/* ---------- riga application ---------- */
@Component({
    selector: 'app-app-row',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [IconComponent, ActionBadgeComponent],
    template: `
        <button class="approw" (click)="store.open(app.numericId)">
            <div><app-action-badge [app]="app" [role]="store.role()" /></div>
            <div class="chip">
                <span class="ph">{{ phaseLabel[app.phase] }}</span>
            </div>
            <div>
                <div class="appname">
                    <span class="flag">{{ app.institution.flag }}</span
                    >{{ app.institution.name }}
                </div>
                <div class="appsub">
                    {{ app.id }} · {{ app.academicYear }} ·
                    {{ store.role() !== 'student' ? app.student.name : app.lecturer.name }}
                </div>
            </div>
            <div class="chev"><app-icon name="chevR" [size]="20" /></div>
        </button>
    `,
})
export class AppRowComponent {
    @Input({ required: true }) app!: Application;
    readonly store = inject(StoreService);
    readonly phaseLabel = PHASE_LABEL;
}

/* ---------- header colonne ---------- */
@Component({
    selector: 'app-list-header',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="list-cols">
            <div>Status</div>
            <div>Fase</div>
            <div>Application</div>
            <div></div>
        </div>
    `,
})
export class ListHeaderComponent {}

/* ---------- STUDENTE ---------- */
@Component({
    selector: 'app-student-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [BtnComponent, AppRowComponent, ListHeaderComponent],
    template: `
        <div class="page">
            <div class="page-head">
                <div>
                    <div class="eyebrow">Programma Overseas · Studente</div>
                    <h1>Le mie applications</h1>
                    <div class="sub">Le tue domande di mobilità presso atenei partner.</div>
                </div>
                <button app-btn variant="primary" icon="plus" (click)="store.go('create')">
                    Nuova application
                </button>
            </div>
            @if (store.listLoading() && store.apps().length === 0) {
                <div class="empty">Caricamento…</div>
            } @else if (store.error()) {
                <div class="empty">{{ store.error() }}</div>
            } @else {
                <app-list-header />
                <div class="list">
                    @for (a of store.apps(); track a.numericId) {
                        <app-app-row [app]="a" />
                    }
                    @if (store.apps().length === 0) {
                        <div class="empty">Non hai ancora creato nessuna application.</div>
                    }
                </div>
            }
        </div>
    `,
})
export class StudentListComponent {
    readonly store = inject(StoreService);
    constructor() {
        this.store.loadList();
    }
}

/* ---------- definizione filtro (condivisa tra docente e ufficio) ---------- */
interface FilterDef {
    id: string;
    label: string;
}

/* ---------- DOCENTE ---------- */
@Component({
    selector: 'app-lecturer-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [IconComponent, AppRowComponent, ListHeaderComponent],
    template: `
        <div class="page">
            <div class="page-head">
                <div>
                    <div class="eyebrow">Programma Overseas · Docente referente</div>
                    <h1>Applications da seguire</h1>
                    <div class="sub">
                        Domande di mobilità per cui sei docente referente.{{
                            todoApps.length
                                ? ' ' + todoApps.length + ' richiedono la tua valutazione.'
                                : ''
                        }}
                    </div>
                </div>
            </div>
            <div class="filterbar">
                @for (f of filters; track f.id) {
                    <button class="fbtn" [class.active]="filter === f.id" (click)="filter = f.id">
                        {{ f.label }}
                    </button>
                }
                <div class="searchbox" style="margin-left:auto">
                    <app-icon name="search" [size]="16" />
                    <input
                        placeholder="Cerca per ateneo, studente, paese…"
                        [value]="q"
                        (input)="q = asInput($event).value"
                    />
                </div>
            </div>
            @if (store.listLoading() && store.apps().length === 0) {
                <div class="empty">Caricamento…</div>
            } @else if (store.error()) {
                <div class="empty">{{ store.error() }}</div>
            } @else {
                <app-list-header />
                <div class="list">
                    @for (a of shown; track a.numericId) {
                        <app-app-row [app]="a" />
                    }
                    @if (shown.length === 0) {
                        <div class="empty">Nessuna application corrisponde ai filtri.</div>
                    }
                </div>
            }
        </div>
    `,
})
export class LecturerListComponent {
    readonly store = inject(StoreService);
    filter = 'all';
    q = '';

    constructor() {
        this.store.loadList();
    }

    asInput(e: Event): HTMLInputElement {
        return e.target as HTMLInputElement;
    }

    /** Pratiche che richiedono un'azione del docente (valutazione LA / modifica / Transcript). */
    get todoApps(): Application[] {
        return this.store.apps().filter((a) => actionStatus(a, 'lecturer').kind === 'todo');
    }

    get filters(): FilterDef[] {
        return [
            { id: 'all', label: 'Tutte' },
            { id: 'todo', label: `Da gestire (${this.todoApps.length})` },
            { id: 'pre-departure', label: 'Pre-partenza' },
            { id: 'during-mobility', label: 'In mobilità' },
            { id: 'after-returning', label: 'Al rientro' },
            { id: 'concluded', label: 'Concluse' },
        ];
    }

    get shown(): Application[] {
        const apps = this.store.apps();
        let shown = apps;
        if (this.filter === 'todo') shown = this.todoApps;
        else if (this.filter !== 'all') shown = apps.filter((a) => a.phase === this.filter);
        if (this.q.trim()) {
            const s = this.q.toLowerCase();
            shown = shown.filter((a) =>
                (a.institution.name + a.student.name + a.id + a.institution.country)
                    .toLowerCase()
                    .includes(s),
            );
        }
        return shown;
    }
}

/* ---------- UFFICIO ---------- */
interface StatDef {
    n: number;
    l: string;
    i: string;
}

@Component({
    selector: 'app-office-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [IconComponent, AppRowComponent, ListHeaderComponent],
    template: `
        <div class="page">
            <div class="page-head">
                <div>
                    <div class="eyebrow">Programma Overseas · Ufficio</div>
                    <h1>Tutte le applications</h1>
                    <div class="sub">
                        Monitora le domande, verifica la pre-partenza e chiudi le pratiche.
                    </div>
                </div>
            </div>
            <div class="stats">
                @for (s of stats; track s.l) {
                    <div class="stat">
                        <span class="si"><app-icon [name]="s.i" [size]="18" /></span>
                        <div class="sn">{{ s.n }}</div>
                        <div class="sl">{{ s.l }}</div>
                    </div>
                }
            </div>
            <div class="filterbar">
                @for (f of filters; track f.id) {
                    <button class="fbtn" [class.active]="filter === f.id" (click)="filter = f.id">
                        {{ f.label }}
                    </button>
                }
                <div class="searchbox" style="margin-left:auto">
                    <app-icon name="search" [size]="16" />
                    <input
                        placeholder="Cerca per ateneo, studente, paese…"
                        [value]="q"
                        (input)="q = asInput($event).value"
                    />
                </div>
            </div>
            @if (store.listLoading() && store.apps().length === 0) {
                <div class="empty">Caricamento…</div>
            } @else if (store.error()) {
                <div class="empty">{{ store.error() }}</div>
            } @else {
                <app-list-header />
                <div class="list">
                    @for (a of shown; track a.numericId) {
                        <app-app-row [app]="a" />
                    }
                    @if (shown.length === 0) {
                        <div class="empty">Nessuna application corrisponde ai filtri.</div>
                    }
                </div>
            }
        </div>
    `,
})
export class OfficeListComponent {
    readonly store = inject(StoreService);
    filter = 'all';
    q = '';

    constructor() {
        this.store.loadList();
    }

    asInput(e: Event): HTMLInputElement {
        return e.target as HTMLInputElement;
    }

    get todoApps(): Application[] {
        return this.store.apps().filter((a) => actionStatus(a, 'office').kind === 'todo');
    }

    get filters(): FilterDef[] {
        return [
            { id: 'all', label: 'Tutte' },
            { id: 'todo', label: `Da gestire (${this.todoApps.length})` },
            { id: 'pre-departure', label: 'Pre-partenza' },
            { id: 'during-mobility', label: 'In mobilità' },
            { id: 'after-returning', label: 'Al rientro' },
            { id: 'concluded', label: 'Concluse' },
        ];
    }

    get stats(): StatDef[] {
        const apps = this.store.apps();
        return [
            { n: apps.length, l: 'Application totali', i: 'list' },
            { n: this.todoApps.length, l: 'Richiedono azione', i: 'inbox' },
            {
                n: apps.filter((a) => a.phase === 'during-mobility').length,
                l: 'In mobilità',
                i: 'globe',
            },
            { n: apps.filter((a) => a.status === 'CLOSED').length, l: 'Concluse', i: 'check' },
        ];
    }

    get shown(): Application[] {
        const apps = this.store.apps();
        let shown = apps;
        if (this.filter === 'todo') shown = this.todoApps;
        else if (this.filter !== 'all') shown = apps.filter((a) => a.phase === this.filter);
        if (this.q.trim()) {
            const s = this.q.toLowerCase();
            shown = shown.filter((a) =>
                (a.institution.name + a.student.name + a.id + a.institution.country)
                    .toLowerCase()
                    .includes(s),
            );
        }
        return shown;
    }
}
