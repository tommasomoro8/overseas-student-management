/* ===========================================================================
   Overseas Mobility — creazione domanda (solo dati essenziali).
   Allineato al backend: la domanda nasce in stato DRAFT con anno/sede/periodo/
   referente; il mapping esami viaggia poi con il Learning Agreement.
   =========================================================================== */
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MobilityPeriod, PERIOD_OPTIONS } from '../core/api.types';
import { StoreService } from '../core/store.service';
import { BtnComponent } from '../ui/btn.component';
import { IconComponent } from '../ui/icon.component';
import { ToastService } from '../ui/toast.service';

@Component({
    selector: 'app-create-wizard',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, IconComponent, BtnComponent],
    template: `
        <div class="page" style="max-width:760px">
            <button class="linkback" (click)="store.back()">
                <app-icon name="chevL" [size]="16" />Applications
            </button>
            <div class="page-head" style="margin-bottom:18px">
                <div>
                    <div class="eyebrow">Nuova domanda di mobilità</div>
                    <h1>Crea application</h1>
                    <div class="sub">
                        Inserisci i dati essenziali. Il Learning Agreement e il mapping esami si
                        caricano dopo, dal dettaglio.
                    </div>
                </div>
            </div>

            <div class="card card-pad">
                <div class="field">
                    <label>Anno accademico</label>
                    <select class="sel" [(ngModel)]="academicYear">
                        <option value="" disabled hidden>Seleziona…</option>
                        @for (y of academicYears; track y) {
                            <option [value]="y">{{ y }}</option>
                        }
                    </select>
                </div>

                <div class="field">
                    <label>Sede ospitante <span class="hint">(atenei partner)</span></label>
                    @if (store.institutions().length === 0) {
                        <div class="muted" style="font-size:13.5px">Caricamento sedi…</div>
                    } @else {
                        <div class="radio-cards">
                            @for (inst of store.institutions(); track inst.id) {
                                <label
                                    class="radio-card"
                                    [class.sel]="institutionId === inst.id"
                                    (click)="institutionId = inst.id"
                                >
                                    <span class="rc-mark"></span>
                                    <span class="rc-flag">{{ inst.flag }}</span>
                                    <span style="flex:1">
                                        <div class="rc-title">{{ inst.name }}</div>
                                        <div class="rc-sub">
                                            {{ inst.city }}, {{ inst.country }} ·
                                            {{ inst.erasmusCode }}
                                        </div>
                                    </span>
                                </label>
                            }
                        </div>
                    }
                </div>

                <div class="grid2">
                    <div class="field">
                        <label>Periodo di mobilità previsto</label>
                        <select class="sel" [(ngModel)]="period">
                            <option value="" disabled hidden>Seleziona…</option>
                            @for (p of periods; track p.id) {
                                <option [value]="p.id">{{ p.label }}</option>
                            }
                        </select>
                    </div>
                    <div class="field">
                        <label>Docente referente</label>
                        <select class="sel" [(ngModel)]="lecturerId">
                            <option [ngValue]="null" disabled hidden>Seleziona…</option>
                            @for (l of store.lecturers(); track l.id) {
                                <option [ngValue]="l.id">{{ l.firstName }} {{ l.lastName }}</option>
                            }
                        </select>
                        @if (store.lecturers().length === 0) {
                            <span class="hint">Nessun docente disponibile.</span>
                        }
                    </div>
                </div>

                <div class="note green" style="margin-top:6px">
                    Dopo la creazione potrai caricare il <strong>Learning Agreement</strong> con il
                    mapping degli esami da inviare al docente.
                </div>
            </div>

            <div style="display:flex;justify-content:space-between;margin-top:22px">
                <button app-btn variant="ghost" (click)="store.back()">Annulla</button>
                <button
                    app-btn
                    variant="primary"
                    icon="check"
                    [disabled]="!valid || busy"
                    (click)="submit()"
                >
                    Crea application
                </button>
            </div>
        </div>
    `,
})
export class CreateWizardComponent {
    readonly store = inject(StoreService);
    private readonly toast = inject(ToastService);
    readonly periods = PERIOD_OPTIONS;

    academicYear = '';
    institutionId: number | null = null;
    period: MobilityPeriod | '' = '';
    lecturerId: number | null = null;
    busy = false;

    readonly academicYears = (() => {
        const currentYear = new Date().getFullYear();
        return [
            `${currentYear - 1}/${currentYear}`,
            `${currentYear}/${currentYear + 1}`,
            `${currentYear + 1}/${currentYear + 2}`,
            `${currentYear + 2}/${currentYear + 3}`,
        ];
    })();

    constructor() {
        this.store.ensureRefData();
    }

    get valid(): boolean {
        return (
            !!this.academicYear &&
            this.institutionId != null &&
            this.period !== '' &&
            this.lecturerId != null
        );
    }

    submit(): void {
        if (
            !this.valid ||
            this.institutionId == null ||
            this.lecturerId == null ||
            this.period === ''
        )
            return;
        this.busy = true;
        this.store
            .createApp({
                referentLecturerId: this.lecturerId,
                hostInstitutionId: this.institutionId,
                academicYear: this.academicYear,
                expectedPeriod: this.period,
            })
            .subscribe({
                next: () => {
                    this.busy = false;
                    this.toast.push('Application creata');
                },
                error: (err) => {
                    this.busy = false;
                    this.toast.push(this.store.errorMessage(err));
                },
            });
    }
}
