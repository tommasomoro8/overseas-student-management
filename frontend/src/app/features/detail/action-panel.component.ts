/* ===========================================================================
   Overseas Mobility — pannello azioni contestuale, guidato dallo STATO backend.
   Implementa fedelmente la macchina a stati: invio LA+mapping, valutazioni,
   pre-partenza, date di mobilità (arrivo+rientro insieme), Transcript+voti, chiusura.
   =========================================================================== */
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ExamMappingInput, ExamResultInput } from '../../core/api.types';
import { Application, LearningAgreement } from '../../core/models';
import { StoreService } from '../../core/store.service';
import { BtnComponent } from '../../ui/btn.component';
import { IconComponent } from '../../ui/icon.component';
import { ToastService } from '../../ui/toast.service';
import { BoxComponent } from './cards.component';
import {
    DecisionModalComponent,
    LearningAgreementModalComponent,
    TranscriptModalComponent,
} from './modals.component';

@Component({
    selector: 'app-action-panel',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        NgTemplateOutlet,
        FormsModule,
        BtnComponent,
        IconComponent,
        BoxComponent,
        DecisionModalComponent,
        LearningAgreementModalComponent,
        TranscriptModalComponent,
    ],
    template: `
        @if (store.role() === 'student') {
            @switch (app.status) {
                @case ('DRAFT') {
                    <app-box
                        kind="todo"
                        icon="upload"
                        title="Carica il Learning Agreement"
                        desc="Per avviare la pratica carica il Learning Agreement (PDF) e indica la corrispondenza tra gli esami all'estero e quelli del tuo piano di studi. Verrà inviato al docente referente."
                    >
                        <button app-btn variant="primary" icon="upload" (click)="showLa = true">
                            Carica Learning Agreement
                        </button>
                    </app-box>
                }
                @case ('LA_REJECTED') {
                    <app-box
                        kind="todo"
                        icon="upload"
                        title="Learning Agreement da ricaricare"
                        desc="Il docente ha rifiutato il Learning Agreement. Correggi e invia una nuova versione."
                    >
                        @if (rejectedLaReason) {
                            <div class="note red" style="margin-bottom:14px">
                                Motivazione: {{ rejectedLaReason }}
                            </div>
                        }
                        <button app-btn variant="primary" icon="upload" (click)="showLa = true">
                            Ricarica Learning Agreement
                        </button>
                    </app-box>
                }
                @case ('LA_SUBMITTED') {
                    <app-box
                        kind="waiting"
                        icon="clock"
                        title="In attesa di approvazione"
                        [desc]="
                            'Il Learning Agreement è in valutazione presso ' +
                            app.lecturer.name +
                            '. Riceverai una risposta a breve.'
                        "
                    />
                }
                @case ('LA_APPROVED') {
                    <app-box
                        kind="waiting"
                        icon="clock"
                        title="In attesa di verifica"
                        desc="Il docente ha approvato il Learning Agreement. L'ufficio Overseas deve verificare la pre-partenza."
                    />
                }
                @case ('PRE_DEPARTURE_APPROVED') {
                    <app-box
                        kind="todo"
                        icon="cal"
                        title="Inserisci le date di mobilità"
                        desc="Comunica la data di arrivo e quella di rientro previste. L'inserimento avvia ufficialmente la mobilità."
                    >
                        <ng-container
                            *ngTemplateOutlet="datesForm; context: { confirm: 'Avvia la mobilità' }"
                        ></ng-container>
                    </app-box>
                }
                @case ('MOBILITY_IN_PROGRESS') {
                    <app-box
                        [kind]="mobilityOverdue ? 'todo' : 'done'"
                        [eyebrowLabel]="mobilityOverdue ? 'Periodo terminato' : 'Mobilità in corso'"
                        icon="globe"
                        title="Mobilità in corso"
                        [desc]="
                            mobilityOverdue
                                ? 'Il periodo di mobilità è terminato: concludi caricando il Transcript con i voti. Se serve, puoi ancora proporre una modifica al piano.'
                                : 'Sei in mobilità, nessuna fretta. Se cambia il calendario esami puoi proporre una modifica al piano; al rientro concludi caricando il Transcript con i voti.'
                        "
                    >
                        <div class="acts">
                            <button app-btn variant="ghost" icon="swap" (click)="showChange = true">
                                Proponi modifica al piano
                            </button>
                            <button
                                app-btn
                                variant="ghost"
                                icon="cal"
                                (click)="datesOpen = !datesOpen"
                            >
                                Correggi le date
                            </button>
                            <button
                                app-btn
                                variant="primary"
                                icon="upload"
                                (click)="showTranscript = true"
                            >
                                Concludi il periodo di mobilità
                            </button>
                        </div>
                        @if (datesOpen) {
                            <div style="margin-top:14px">
                                <ng-container
                                    *ngTemplateOutlet="
                                        datesForm;
                                        context: { confirm: 'Salva le date' }
                                    "
                                ></ng-container>
                            </div>
                        }
                    </app-box>
                }
                @case ('LA_CHANGE_SUBMITTED') {
                    <app-box
                        kind="waiting"
                        icon="clock"
                        title="Modifica in valutazione"
                        [desc]="
                            'La modifica al piano esami è in attesa di approvazione da parte di ' +
                            app.lecturer.name +
                            '.'
                        "
                    />
                }
                @case ('TOR_SUBMITTED') {
                    <app-box
                        kind="waiting"
                        icon="clock"
                        title="In attesa di approvazione esami"
                        [desc]="
                            app.lecturer.name + ' sta verificando il Transcript e i voti inseriti.'
                        "
                    />
                }
                @case ('TOR_REJECTED') {
                    <app-box
                        kind="todo"
                        icon="upload"
                        title="Transcript da ricaricare"
                        desc="Il docente ha rifiutato il Transcript. Carica una nuova versione con i voti corretti."
                    >
                        @if (rejectedTorReason) {
                            <div class="note red" style="margin-bottom:14px">
                                Motivazione: {{ rejectedTorReason }}
                            </div>
                        }
                        <button
                            app-btn
                            variant="primary"
                            icon="upload"
                            (click)="showTranscript = true"
                        >
                            Ricarica il Transcript
                        </button>
                    </app-box>
                }
                @case ('TOR_APPROVED') {
                    <app-box
                        kind="waiting"
                        icon="clock"
                        title="In attesa di chiusura"
                        desc="Il docente ha approvato gli esami. L'ufficio Overseas chiuderà l'application."
                    />
                }
                @case ('CLOSED') {
                    <app-box
                        kind="done"
                        eyebrowLabel="Concluso"
                        icon="check"
                        title="Mobilità conclusa"
                        desc="Tutti gli esami sono stati riconosciuti e l'application è stata chiusa. Non sono richieste altre azioni."
                    />
                }
            }

            @if (showLa) {
                <app-la-modal
                    [title]="
                        app.status === 'DRAFT'
                            ? 'Carica il Learning Agreement'
                            : 'Ricarica il Learning Agreement'
                    "
                    [mode]="'submit'"
                    [initialExams]="app.exams"
                    [busy]="busy"
                    [sampleName]="laSample"
                    (closed)="showLa = false"
                    (submitted)="onSubmitLa($event)"
                />
            }
            @if (showChange) {
                <app-la-modal
                    title="Proponi una modifica al piano esami"
                    submitLabel="Invia al docente"
                    [mode]="'change'"
                    [initialExams]="app.exams"
                    [busy]="busy"
                    [sampleName]="laSample"
                    (closed)="showChange = false"
                    (submitted)="onSubmitLa($event)"
                />
            }
            @if (showTranscript) {
                <app-transcript-modal
                    [exams]="app.exams"
                    [busy]="busy"
                    [sampleName]="torSample"
                    (closed)="showTranscript = false"
                    (submitted)="onUploadTranscript($event)"
                />
            }
        } @else if (store.role() === 'lecturer') {
            @switch (app.status) {
                @case ('LA_SUBMITTED') {
                    <app-box
                        kind="todo"
                        icon="file"
                        title="Valuta il Learning Agreement"
                        [desc]="
                            'Lo studente ' +
                            app.student.name +
                            ' ha inviato il Learning Agreement. Visiona il documento e il mapping esami qui sotto, poi approva o rifiuta.'
                        "
                    >
                        @if (activeLa) {
                            <div class="doc" style="margin-bottom:14px">
                                <div class="fic"><app-icon name="file" /></div>
                                <div class="fmeta">
                                    <div class="fname">{{ activeLa.fileName }}</div>
                                    <div class="fsub">v{{ activeLa.version }}</div>
                                </div>
                                <button
                                    app-btn
                                    variant="subtle"
                                    size="sm"
                                    icon="download"
                                    (click)="downloadLa()"
                                >
                                    Scarica
                                </button>
                            </div>
                        }
                        <div class="acts">
                            <button
                                app-btn
                                variant="success"
                                icon="check"
                                (click)="decision = 'la'"
                            >
                                Approva / Rifiuta
                            </button>
                        </div>
                    </app-box>
                }
                @case ('LA_CHANGE_SUBMITTED') {
                    <app-box
                        kind="todo"
                        icon="swap"
                        title="Valuta la modifica proposta"
                        [desc]="changeDesc || 'Modifica al piano esami proposta dallo studente.'"
                    >
                        @if (activeLa) {
                            <div class="doc" style="margin-bottom:14px">
                                <div class="fic"><app-icon name="file" /></div>
                                <div class="fmeta">
                                    <div class="fname">{{ activeLa.fileName }}</div>
                                    <div class="fsub">nuova versione · v{{ activeLa.version }}</div>
                                </div>
                                <button
                                    app-btn
                                    variant="subtle"
                                    size="sm"
                                    icon="download"
                                    (click)="downloadLa()"
                                >
                                    Scarica
                                </button>
                            </div>
                        }
                        <div class="acts">
                            <button
                                app-btn
                                variant="success"
                                icon="check"
                                (click)="decision = 'la'"
                            >
                                Approva / Rifiuta
                            </button>
                        </div>
                    </app-box>
                }
                @case ('TOR_SUBMITTED') {
                    <app-box
                        kind="todo"
                        icon="grad"
                        title="Approva esami e voti"
                        desc="Rivedi il Transcript of Records e i voti riportati nella tabella esami, quindi approva il riconoscimento."
                    >
                        @if (activeTor) {
                            <div class="doc" style="margin-bottom:14px">
                                <div
                                    class="fic"
                                    style="background:var(--info-soft);color:var(--info)"
                                >
                                    <app-icon name="book" />
                                </div>
                                <div class="fmeta">
                                    <div class="fname">{{ activeTor.fileName }}</div>
                                    <div class="fsub">Transcript of Records</div>
                                </div>
                                <button
                                    app-btn
                                    variant="subtle"
                                    size="sm"
                                    icon="download"
                                    (click)="downloadTor()"
                                >
                                    Scarica
                                </button>
                            </div>
                        }
                        <div class="acts">
                            <button
                                app-btn
                                variant="success"
                                icon="check"
                                (click)="decision = 'tor'"
                            >
                                Approva / Rifiuta esami
                            </button>
                        </div>
                    </app-box>
                }
                @default {
                    <app-box
                        kind="done"
                        icon="check"
                        title="Nessuna azione richiesta"
                        desc="Non ci sono valutazioni in sospeso per questa application."
                    />
                }
            }

            @if (decision === 'la') {
                <app-decision-modal
                    [title]="laTitle"
                    [what]="laWhat"
                    [busy]="busy"
                    (closed)="decision = null"
                    (approved)="decideLa('APPROVED')"
                    (rejected)="decideLa('REJECTED', $event)"
                />
            }
            @if (decision === 'tor') {
                <app-decision-modal
                    title="Approvazione esami"
                    what="Confermi il riconoscimento di tutti gli esami con i voti riportati nel Transcript?"
                    [busy]="busy"
                    (closed)="decision = null"
                    (approved)="decideTor('APPROVED')"
                    (rejected)="decideTor('REJECTED', $event)"
                />
            }
        } @else {
            @switch (app.status) {
                @case ('LA_APPROVED') {
                    <app-box
                        kind="todo"
                        icon="check"
                        title="Verifica la pre-partenza"
                        desc="Il Learning Agreement è stato approvato dal docente. Conferma il completamento della fase di pre-partenza."
                    >
                        <div class="acts">
                            <button
                                app-btn
                                variant="primary"
                                icon="check"
                                [disabled]="busy"
                                (click)="approvePreDeparture()"
                            >
                                Segna pre-partenza completata
                            </button>
                        </div>
                    </app-box>
                }
                @case ('TOR_APPROVED') {
                    <app-box
                        kind="todo"
                        icon="lock"
                        title="Chiudi l'application"
                        desc="Il docente ha approvato tutti gli esami. Puoi chiudere definitivamente l'application."
                    >
                        <div class="acts">
                            <button
                                app-btn
                                variant="primary"
                                icon="lock"
                                [disabled]="busy"
                                (click)="closeApp()"
                            >
                                Chiudi application
                            </button>
                        </div>
                    </app-box>
                }
                @case ('CLOSED') {
                    <app-box
                        kind="done"
                        eyebrowLabel="Concluso"
                        icon="check"
                        title="Application conclusa"
                        desc="L'application è stata chiusa correttamente. Tutti gli esami risultano riconosciuti."
                    />
                }
                @default {
                    <app-box
                        kind="done"
                        icon="clock"
                        title="In monitoraggio"
                        desc="L'application sta procedendo. Nessuna azione dell'ufficio richiesta in questa fase."
                    />
                }
            }
        }

        <!-- form date di mobilità (arrivo + rientro insieme), riusato in due punti -->
        <ng-template #datesForm let-confirm="confirm">
            <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap">
                <div class="field" style="margin-bottom:0;min-width:170px">
                    <label>Data di arrivo</label>
                    <input type="date" class="inp" [(ngModel)]="arrival" />
                </div>
                <div class="field" style="margin-bottom:0;min-width:170px">
                    <label>Data di rientro</label>
                    <input type="date" class="inp" [(ngModel)]="departure" />
                </div>
                <button
                    app-btn
                    variant="primary"
                    icon="check"
                    [disabled]="!datesValid || busy"
                    (click)="saveDates()"
                >
                    {{ confirm }}
                </button>
            </div>
            @if (arrival && departure && departure < arrival) {
                <div class="note red" style="margin-top:10px">
                    La data di rientro deve essere uguale o successiva a quella di arrivo.
                </div>
            }
        </ng-template>
    `,
})
export class ActionPanelComponent {
    @Input({ required: true }) app!: Application;
    readonly store = inject(StoreService);
    readonly toast = inject(ToastService);

    busy = false;
    showLa = false;
    showChange = false;
    showTranscript = false;
    datesOpen = false;
    decision: 'la' | 'tor' | null = null;
    arrival = '';
    departure = '';

    /** True se la data di rientro prevista è già passata: concludere la mobilità diventa urgente. */
    get mobilityOverdue(): boolean {
        if (!this.app.departure) return false;
        return this.app.departure.slice(0, 10) < new Date().toISOString().slice(0, 10);
    }

    get laSample(): string {
        return `LA_${this.app.numericId}.pdf`;
    }
    get torSample(): string {
        return `ToR_${this.app.numericId}.pdf`;
    }
    get activeLa(): LearningAgreement | undefined {
        return this.app.learningAgreements.find((l) => l.isActive);
    }
    get activeTor() {
        return this.app.transcripts.find((t) => t.isActive);
    }
    get changeDesc(): string | null {
        return this.activeLa?.changeDescription ?? null;
    }
    get rejectedLaReason(): string | null {
        const active = this.activeLa;
        if (active && active.status === 'rejected') return active.reason;
        return (
            [...this.app.learningAgreements].reverse().find((l) => l.status === 'rejected')
                ?.reason ?? null
        );
    }
    get rejectedTorReason(): string | null {
        return (
            [...this.app.transcripts].reverse().find((t) => t.status === 'rejected')?.reason ?? null
        );
    }
    get laTitle(): string {
        return this.app.status === 'LA_CHANGE_SUBMITTED'
            ? 'Valutazione modifica piano esami'
            : 'Valutazione Learning Agreement';
    }
    get laWhat(): string {
        return this.app.status === 'LA_CHANGE_SUBMITTED'
            ? 'In caso di rifiuto verranno ripristinati il piano esami e il Learning Agreement precedenti.'
            : 'Confermi la valutazione del Learning Agreement inviato dallo studente?';
    }
    get datesValid(): boolean {
        return !!this.arrival && !!this.departure && this.departure >= this.arrival;
    }

    // ---- studente ----
    onSubmitLa(e: { file: File; mappings: ExamMappingInput[]; changeDescription?: string }): void {
        this.busy = true;
        this.store.submitLearningAgreement(e.file, e.mappings, e.changeDescription).subscribe({
            next: () => {
                this.busy = false;
                this.showLa = false;
                this.showChange = false;
                this.toast.push(
                    e.changeDescription
                        ? 'Modifica inviata al docente'
                        : 'Learning Agreement inviato',
                );
            },
            error: (err) => this.fail(err),
        });
    }

    onUploadTranscript(e: { file: File; results: ExamResultInput[] }): void {
        this.busy = true;
        this.store.uploadTranscript(e.file, e.results).subscribe({
            next: () => {
                this.busy = false;
                this.showTranscript = false;
                this.toast.push('Transcript e voti inviati al docente');
            },
            error: (err) => this.fail(err),
        });
    }

    saveDates(): void {
        if (!this.datesValid) return;
        this.busy = true;
        this.store.setMobilityDates(this.arrival, this.departure).subscribe({
            next: () => {
                this.busy = false;
                this.datesOpen = false;
                this.toast.push('Date di mobilità registrate');
            },
            error: (err) => this.fail(err),
        });
    }

    // ---- docente ----
    decideLa(decision: 'APPROVED' | 'REJECTED', reason?: string): void {
        this.busy = true;
        this.store.evaluateLearningAgreement(decision, reason).subscribe({
            next: () => {
                this.busy = false;
                this.decision = null;
                this.toast.push(
                    decision === 'APPROVED'
                        ? 'Learning Agreement approvato'
                        : 'Learning Agreement rifiutato',
                );
            },
            error: (err) => this.fail(err),
        });
    }

    decideTor(decision: 'APPROVED' | 'REJECTED', reason?: string): void {
        this.busy = true;
        this.store.evaluateTranscript(decision, reason).subscribe({
            next: () => {
                this.busy = false;
                this.decision = null;
                this.toast.push(
                    decision === 'APPROVED' ? 'Esami approvati' : 'Transcript rifiutato',
                );
            },
            error: (err) => this.fail(err),
        });
    }

    // ---- ufficio ----
    approvePreDeparture(): void {
        this.busy = true;
        this.store.approvePreDeparture().subscribe({
            next: () => {
                this.busy = false;
                this.toast.push('Pre-partenza verificata');
            },
            error: (err) => this.fail(err),
        });
    }

    closeApp(): void {
        this.busy = true;
        this.store.closeApplication().subscribe({
            next: () => {
                this.busy = false;
                this.toast.push('Application conclusa');
            },
            error: (err) => this.fail(err),
        });
    }

    // ---- download ----
    downloadLa(): void {
        if (this.activeLa)
            this.store.downloadLearningAgreement(this.activeLa.id, this.activeLa.fileName);
    }
    downloadTor(): void {
        if (this.activeTor)
            this.store.downloadTranscript(this.activeTor.id, this.activeTor.fileName);
    }

    private fail(err: unknown): void {
        this.busy = false;
        this.toast.push(this.store.errorMessage(err));
    }
}
