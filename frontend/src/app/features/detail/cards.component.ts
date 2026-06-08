/* ===========================================================================
   Overseas Mobility — detail cards (port of detail.jsx MetaBar/DocsCard/
   ModsCard/DatesCard + the Box callout wrapper)
   =========================================================================== */
import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { Application, Role } from '../../core/models';
import { fmtDate } from '../../core/ovs-data';
import { StoreService } from '../../core/store.service';
import { BadgeComponent } from '../../ui/badge.component';
import { IconComponent } from '../../ui/icon.component';

/* ---------- meta bar ---------- */
@Component({
    selector: 'app-meta-bar',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="detail-meta">
            <div class="mi">
                <span class="k">Anno accademico</span><span class="v">{{ app.academicYear }}</span>
            </div>
            <div class="mi">
                <span class="k">Periodo</span><span class="v">{{ app.period.label }}</span>
            </div>
            <div class="mi">
                <span class="k">Sede ospitante</span
                ><span class="v">{{ app.institution.city }}, {{ app.institution.country }}</span>
            </div>
            @if (role === 'student') {
                <div class="mi">
                    <span class="k">Docente referente</span
                    ><span class="v">{{ app.lecturer.name }}</span>
                </div>
            } @else {
                <div class="mi">
                    <span class="k">Studente</span>
                    <span class="v"
                        >{{ app.student.name
                        }}{{ app.student.matricola ? ' · ' + app.student.matricola : '' }}</span
                    >
                </div>
            }
            <div class="mi">
                <span class="k">ID application</span>
                <span class="v" style="font-family:var(--font-mono);font-size:12.5px">{{
                    app.id
                }}</span>
            </div>
        </div>
    `,
})
export class MetaBarComponent {
    @Input({ required: true }) app!: Application;
    @Input({ required: true }) role!: Role;
}

/* ---------- documents ---------- */
@Component({
    selector: 'app-docs-card',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [IconComponent, BadgeComponent],
    template: `
        <div class="card">
            <div class="card-head">
                <h3>Documenti</h3>
                <span class="ic"><app-icon name="file" /></span>
            </div>
            <div class="card-pad" style="display:flex;flex-direction:column;gap:12px">
                @if (app.learningAgreements.length === 0 && app.transcripts.length === 0) {
                    <div class="muted" style="font-size:13.5px">Nessun documento caricato.</div>
                }
                @for (l of app.learningAgreements; track l.version) {
                    <div class="doc">
                        <div class="fic"><app-icon name="file" /></div>
                        <div class="fmeta">
                            <div class="fname">{{ l.fileName }}</div>
                            <div class="fsub">
                                Learning Agreement · v{{ l.version }} · {{ fmtDate(l.at) }}
                            </div>
                        </div>
                        @switch (l.status) {
                            @case ('approved') {
                                <app-badge kind="none">Approvata</app-badge>
                            }
                            @case ('rejected') {
                                <app-badge kind="danger">Rifiutata</app-badge>
                            }
                            @default {
                                <app-badge kind="waiting">In valutazione</app-badge>
                            }
                        }
                        <button
                            class="iconbtn"
                            title="Scarica"
                            (click)="store.downloadLearningAgreement(l.id, l.fileName)"
                        >
                            <app-icon name="download" [size]="17" />
                        </button>
                    </div>
                }
                @for (t of app.transcripts; track t.id) {
                    <div class="doc">
                        <div class="fic" style="background:var(--info-soft);color:var(--info)">
                            <app-icon name="book" />
                        </div>
                        <div class="fmeta">
                            <div class="fname">{{ t.fileName }}</div>
                            <div class="fsub">
                                Transcript of Records · v{{ t.version }} · {{ fmtDate(t.at) }}
                            </div>
                        </div>
                        @switch (t.status) {
                            @case ('approved') {
                                <app-badge kind="none">Approvato</app-badge>
                            }
                            @case ('rejected') {
                                <app-badge kind="danger">Rifiutato</app-badge>
                            }
                            @default {
                                <app-badge kind="waiting">In valutazione</app-badge>
                            }
                        }
                        <button
                            class="iconbtn"
                            title="Scarica"
                            (click)="store.downloadTranscript(t.id, t.fileName)"
                        >
                            <app-icon name="download" [size]="17" />
                        </button>
                    </div>
                }
            </div>
        </div>
    `,
})
export class DocsCardComponent {
    @Input({ required: true }) app!: Application;
    readonly store = inject(StoreService);
    readonly fmtDate = fmtDate;
}

/* ---------- exam-plan modifications ---------- */
@Component({
    selector: 'app-mods-card',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [IconComponent, BadgeComponent],
    template: `
        @if (app.modifications.length) {
            <div class="card">
                <div class="card-head">
                    <h3>Modifiche al piano esami</h3>
                    <span class="ic"><app-icon name="swap" /></span>
                </div>
                <div class="card-pad" style="display:flex;flex-direction:column;gap:14px">
                    @for (m of app.modifications; track m.id; let i = $index) {
                        <div
                            style="display:flex;flex-direction:column;gap:8px"
                            [style.border-top]="i > 0 ? '1px solid var(--border)' : 'none'"
                            [style.padding-top.px]="i > 0 ? 14 : 0"
                        >
                            <div
                                style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start"
                            >
                                <div style="font-size:13.5px">{{ m.description }}</div>
                                @switch (m.status) {
                                    @case ('approved') {
                                        <app-badge kind="none">Approvata</app-badge>
                                    }
                                    @case ('rejected') {
                                        <app-badge kind="danger">Rifiutata</app-badge>
                                    }
                                    @default {
                                        <app-badge kind="waiting">In valutazione</app-badge>
                                    }
                                }
                            </div>
                            <div class="muted" style="font-size:12px;font-family:var(--font-mono)">
                                Proposta il {{ fmtDate(m.at, true) }} · nuova LA v{{ m.laVersion }}
                            </div>
                            @if (m.reason) {
                                <div class="note red">Motivazione: {{ m.reason }}</div>
                            }
                        </div>
                    }
                </div>
            </div>
        }
    `,
})
export class ModsCardComponent {
    @Input({ required: true }) app!: Application;
    readonly fmtDate = fmtDate;
}

/* ---------- mobility dates ---------- */
@Component({
    selector: 'app-dates-card',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [IconComponent],
    template: `
        @if (app.phase !== 'pre-departure') {
            <div class="card">
                <div class="card-head">
                    <h3>Date di mobilità</h3>
                    <span class="ic"><app-icon name="cal" /></span>
                </div>
                <div class="card-pad">
                    <div class="kvs">
                        <div class="kv">
                            <span class="k">Arrivo presso la sede</span
                            ><span class="v">{{ fmtDate(app.arrival) }}</span>
                        </div>
                        <div class="kv">
                            <span class="k">Rientro</span>
                            <span class="v">
                                @if (app.departure) {
                                    {{ fmtDate(app.departure) }}
                                } @else {
                                    <span class="muted">da inserire</span>
                                }
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        }
    `,
})
export class DatesCardComponent {
    @Input({ required: true }) app!: Application;
    readonly fmtDate = fmtDate;
}

/* ---------- callout / action box ---------- */
@Component({
    selector: 'app-box',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [IconComponent],
    template: `
        <div [class]="cls">
            @if (eyebrow) {
                <div class="box-eyebrow {{ eyebrow.cls }}">{{ eyebrow.text }}</div>
            }
            <div class="ttl"><app-icon [name]="icon" [size]="18" />{{ title }}</div>
            <div class="desc">{{ desc }}</div>
            <div class="box-children"><ng-content /></div>
        </div>
    `,
})
export class BoxComponent {
    // todo = arancione (devo agire) · waiting = azzurro (aspetto altri) · done = verde (tutto a posto)
    @Input() kind: 'todo' | 'waiting' | 'done' = 'done';
    @Input({ required: true }) icon!: string;
    @Input() title = '';
    @Input() desc = '';
    @Input() eyebrowLabel?: string;

    get cls(): string {
        const variant = this.kind === 'todo' ? 'amber' : this.kind === 'done' ? 'green' : '';
        return `action-box ${variant}`.trim();
    }

    // Etichetta in cima al box: comunica a colpo d'occhio lo stato (azione/attesa/ok).
    get eyebrow(): { text: string; cls: string } {
        const cls = this.kind === 'todo' ? 'amber' : this.kind === 'done' ? 'green' : 'info';
        const fallback =
            this.kind === 'todo'
                ? 'Azione richiesta'
                : this.kind === 'done'
                  ? 'Tutto in regola'
                  : 'In attesa';
        return { text: this.eyebrowLabel ?? fallback, cls };
    }
}
