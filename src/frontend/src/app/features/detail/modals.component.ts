/* ===========================================================================
   Overseas Mobility — modali del workflow, allineate alle regole backend:
   - DecisionModal: approva/rifiuta (motivazione obbligatoria al rifiuto)
   - LearningAgreementModal: PDF + mapping esami (+ descrizione per le modifiche)
   - TranscriptModal: PDF + voti (stringa) e date, per tutti gli esami attivi
   =========================================================================== */
import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    OnInit,
    Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ExamMappingInput, ExamResultInput } from '../../core/api.types';
import { Exam } from '../../core/models';
import { BtnComponent } from '../../ui/btn.component';
import { DropzoneComponent } from '../../ui/dropzone.component';
import { IconComponent } from '../../ui/icon.component';
import { ModalComponent } from '../../ui/modal.component';

interface MapRow {
    foreignCode: string;
    foreignName: string;
    foreignCredits: number | null;
    cfCode: string;
    cfTitle: string;
    cfCredits: number | null;
}

/* ---------------- approve / reject ---------------- */
@Component({
    selector: 'app-decision-modal',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, ModalComponent, BtnComponent],
    template: `
        <app-modal [title]="title" (onClose)="closed.emit()">
            <p style="margin-top:0;color:var(--text-2);font-size:14px">{{ what }}</p>
            @if (mode === 'reject') {
                <div class="field" style="margin-bottom:0;margin-top:14px">
                    <label>Motivazione del rifiuto <span style="color:var(--red)">*</span></label>
                    <textarea
                        class="ta"
                        [(ngModel)]="reason"
                        placeholder="Spiega allo studente cosa correggere…"
                        autofocus
                    ></textarea>
                    <span class="hint"
                        >La motivazione viene registrata e mostrata allo studente.</span
                    >
                </div>
            }
            <div modalFooter style="display:contents">
                @if (mode === 'reject') {
                    <button app-btn variant="subtle" (click)="mode = null">Indietro</button>
                    <button
                        app-btn
                        variant="danger-o"
                        icon="x"
                        [disabled]="!reason.trim() || busy"
                        (click)="rejected.emit(reason.trim())"
                    >
                        Conferma rifiuto
                    </button>
                } @else {
                    <button
                        app-btn
                        variant="danger-o"
                        icon="x"
                        [disabled]="busy"
                        (click)="mode = 'reject'"
                    >
                        Rifiuta
                    </button>
                    <button
                        app-btn
                        variant="success"
                        icon="check"
                        [disabled]="busy"
                        (click)="approved.emit()"
                    >
                        Approva
                    </button>
                }
            </div>
        </app-modal>
    `,
})
export class DecisionModalComponent {
    @Input() title = '';
    @Input() what = '';
    @Input() busy = false;
    @Output() closed = new EventEmitter<void>();
    @Output() approved = new EventEmitter<void>();
    @Output() rejected = new EventEmitter<string>();

    mode: 'reject' | null = null;
    reason = '';
}

/* ---------------- Learning Agreement (PDF + mapping [+ descrizione]) ---------------- */
@Component({
    selector: 'app-la-modal',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, ModalComponent, BtnComponent, IconComponent, DropzoneComponent],
    template: `
        <app-modal [title]="title" [wide]="true" (onClose)="closed.emit()">
            @if (mode === 'change') {
                <div class="field">
                    <label
                        >Descrizione della modifica <span style="color:var(--red)">*</span></label
                    >
                    <textarea
                        class="ta"
                        [(ngModel)]="changeDescription"
                        placeholder="Es. Sostituito 'Computer Vision' con 'NLP' per indisponibilità del corso…"
                        autofocus
                    ></textarea>
                </div>
            }
            <div class="field">
                <label
                    >Documento Learning Agreement (PDF)
                    <span style="color:var(--red)">*</span></label
                >
                @if (file) {
                    <div class="doc">
                        <div class="fic"><app-icon name="file" /></div>
                        <div class="fmeta">
                            <div class="fname">{{ file.name }}</div>
                            <div class="fsub">pronto al caricamento</div>
                        </div>
                        <button class="iconbtn" (click)="file = null">
                            <app-icon name="x" [size]="16" />
                        </button>
                    </div>
                } @else {
                    <app-dropzone [sampleName]="sampleName" (picked)="file = $event" />
                }
            </div>

            <div class="eyebrow" style="margin:4px 0 10px">Mapping esami estero → Ca' Foscari</div>
            <div style="display:flex;flex-direction:column;gap:14px">
                @for (r of rows; track $index; let i = $index) {
                    <div
                        class="card"
                        style="box-shadow:none;border-color:var(--border);background:var(--surface-2)"
                    >
                        <div class="card-head" style="padding:10px 16px">
                            <h3 style="font-size:13px;color:var(--text-2)">Esame {{ i + 1 }}</h3>
                            @if (rows.length > 1) {
                                <button class="iconbtn" (click)="delRow(i)">
                                    <app-icon name="x" [size]="16" />
                                </button>
                            }
                        </div>
                        <div class="card-pad" style="padding-top:14px">
                            <div class="exam-pair" style="align-items:stretch">
                                <div>
                                    <div class="eyebrow" style="margin-bottom:8px">
                                        Corso all'estero
                                    </div>
                                    <div class="field">
                                        <label>Codice</label
                                        ><input
                                            class="inp mono"
                                            [(ngModel)]="r.foreignCode"
                                            placeholder="COMS4115"
                                        />
                                    </div>
                                    <div class="field">
                                        <label>Nome del corso</label
                                        ><input
                                            class="inp"
                                            [(ngModel)]="r.foreignName"
                                            placeholder="Programming Languages"
                                        />
                                    </div>
                                    <div class="field" style="margin-bottom:0">
                                        <label>Crediti</label
                                        ><input
                                            type="number"
                                            min="0"
                                            class="inp mono"
                                            [(ngModel)]="r.foreignCredits"
                                            placeholder="6"
                                        />
                                    </div>
                                </div>
                                <div class="arrow" style="padding-top:36px">
                                    <app-icon name="arrowR" [size]="18" />
                                </div>
                                <div>
                                    <div class="eyebrow" style="margin-bottom:8px">
                                        Piano di studi Ca' Foscari
                                    </div>
                                    <div class="field">
                                        <label>Codice</label
                                        ><input
                                            class="inp mono"
                                            [(ngModel)]="r.cfCode"
                                            placeholder="CM0473"
                                        />
                                    </div>
                                    <div class="field">
                                        <label>Titolo</label
                                        ><input
                                            class="inp"
                                            [(ngModel)]="r.cfTitle"
                                            placeholder="Linguaggi di Programmazione"
                                        />
                                    </div>
                                    <div class="field" style="margin-bottom:0">
                                        <label>CFU</label
                                        ><input
                                            type="number"
                                            min="0"
                                            class="inp mono"
                                            [(ngModel)]="r.cfCredits"
                                            placeholder="6"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                }
            </div>
            <button app-btn variant="subtle" icon="plus" (click)="addRow()" style="margin-top:14px">
                Aggiungi esame
            </button>

            <div modalFooter style="display:contents">
                <button app-btn variant="subtle" (click)="closed.emit()">Annulla</button>
                <button
                    app-btn
                    variant="primary"
                    icon="check"
                    [disabled]="!valid || busy"
                    (click)="submit()"
                >
                    {{ submitLabel }}
                </button>
            </div>
        </app-modal>
    `,
})
export class LearningAgreementModalComponent implements OnInit {
    @Input() title = 'Carica il Learning Agreement';
    @Input() submitLabel = 'Invia al docente';
    @Input() sampleName = 'Learning_Agreement.pdf';
    @Input() mode: 'submit' | 'change' = 'submit';
    @Input() initialExams: Exam[] = [];
    @Input() busy = false;
    @Output() closed = new EventEmitter<void>();
    @Output() submitted = new EventEmitter<{
        file: File;
        mappings: ExamMappingInput[];
        changeDescription?: string;
    }>();

    file: File | null = null;
    changeDescription = '';
    rows: MapRow[] = [];

    ngOnInit(): void {
        this.rows = this.initialExams.length
            ? this.initialExams.map((e) => ({
                  foreignCode: e.foreignCode,
                  foreignName: e.foreignName,
                  foreignCredits: e.foreignCredits ?? null,
                  cfCode: e.cfCode,
                  cfTitle: e.cfTitle,
                  cfCredits: e.cfCredits ?? null,
              }))
            : [this.blank()];
    }

    blank(): MapRow {
        return {
            foreignCode: '',
            foreignName: '',
            foreignCredits: null,
            cfCode: '',
            cfTitle: '',
            cfCredits: null,
        };
    }
    addRow(): void {
        this.rows = [...this.rows, this.blank()];
    }
    delRow(i: number): void {
        this.rows = this.rows.filter((_, j) => j !== i);
    }

    get valid(): boolean {
        if (!this.file) return false;
        if (this.mode === 'change' && !this.changeDescription.trim()) return false;
        return (
            this.rows.length > 0 &&
            this.rows.every(
                (r) =>
                    r.foreignCode.trim() &&
                    r.foreignName.trim() &&
                    r.foreignCredits != null &&
                    r.cfCode.trim() &&
                    r.cfTitle.trim() &&
                    r.cfCredits != null,
            )
        );
    }

    submit(): void {
        if (!this.valid || !this.file) return;
        const mappings: ExamMappingInput[] = this.rows.map((r) => ({
            foreignCode: r.foreignCode.trim(),
            foreignTitle: r.foreignName.trim(),
            foreignCredits: r.foreignCredits ?? 0,
            homeCode: r.cfCode.trim(),
            homeTitle: r.cfTitle.trim(),
            homeCredits: r.cfCredits ?? 0,
        }));
        this.submitted.emit({
            file: this.file,
            mappings,
            changeDescription: this.mode === 'change' ? this.changeDescription.trim() : undefined,
        });
    }
}

/* ---------------- Transcript of Records (PDF + voti+date per esame) ---------------- */
interface ScoreRow {
    score: string;
    date: string;
}

@Component({
    selector: 'app-transcript-modal',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, ModalComponent, BtnComponent, IconComponent, DropzoneComponent],
    template: `
        <app-modal title="Concludi il periodo di mobilità" [wide]="true" (onClose)="closed.emit()">
            <p style="margin-top:0;color:var(--text-2);font-size:14px">
                Per concludere la mobilità carica il Transcript of Records con i voti e le date
                d'esame. Verrà inviato al docente per l'approvazione.
            </p>
            <div class="field">
                <label>Documento Transcript (PDF) <span style="color:var(--red)">*</span></label>
                @if (file) {
                    <div class="doc">
                        <div class="fic"><app-icon name="file" /></div>
                        <div class="fmeta">
                            <div class="fname">{{ file.name }}</div>
                            <div class="fsub">pronto al caricamento</div>
                        </div>
                        <button class="iconbtn" (click)="file = null">
                            <app-icon name="x" [size]="16" />
                        </button>
                    </div>
                } @else {
                    <app-dropzone
                        [sampleName]="sampleName"
                        hint="Transcript of Records · PDF"
                        (picked)="file = $event"
                    />
                }
            </div>

            <div class="eyebrow" style="margin:4px 0 10px">Voti e date d'esame</div>
            <div style="display:flex;flex-direction:column;gap:14px">
                @for (e of exams; track $index; let i = $index) {
                    <div
                        [style.border-bottom]="
                            i < exams.length - 1 ? '1px solid var(--border)' : 'none'
                        "
                        style="padding-bottom:14px"
                    >
                        <div style="font-weight:600;font-size:14px">{{ e.cfTitle }}</div>
                        <div
                            class="muted"
                            style="font-size:12px;font-family:var(--font-mono);margin-bottom:10px"
                        >
                            {{ e.foreignName }} · {{ e.foreignCode }}
                        </div>
                        <div style="display:flex;gap:12px">
                            <div class="field" style="margin-bottom:0;width:150px">
                                <label>Voto</label>
                                <input
                                    class="inp mono"
                                    [(ngModel)]="rows[i].score"
                                    placeholder="28 / 30L / A"
                                />
                            </div>
                            <div class="field" style="margin-bottom:0;flex:1">
                                <label>Data d'esame</label>
                                <input type="date" class="inp" [(ngModel)]="rows[i].date" />
                            </div>
                        </div>
                    </div>
                }
            </div>

            <div modalFooter style="display:contents">
                <button app-btn variant="subtle" (click)="closed.emit()">Annulla</button>
                <button
                    app-btn
                    variant="primary"
                    icon="check"
                    [disabled]="!valid || busy"
                    (click)="submit()"
                >
                    Invia Transcript e voti
                </button>
            </div>
        </app-modal>
    `,
})
export class TranscriptModalComponent implements OnInit {
    @Input({ required: true }) exams!: Exam[];
    @Input() sampleName = 'Transcript_of_Records.pdf';
    @Input() busy = false;
    @Output() closed = new EventEmitter<void>();
    @Output() submitted = new EventEmitter<{ file: File; results: ExamResultInput[] }>();

    file: File | null = null;
    rows: ScoreRow[] = [];

    ngOnInit(): void {
        this.rows = this.exams.map((e) => ({ score: e.score ?? '', date: e.examDate ?? '' }));
    }

    get valid(): boolean {
        return (
            !!this.file &&
            this.rows.length === this.exams.length &&
            this.rows.every((r) => r.score.trim() !== '' && r.date !== '')
        );
    }

    submit(): void {
        if (!this.valid || !this.file) return;
        const results: ExamResultInput[] = this.exams.map((e, i) => ({
            examMappingId: e.mappingId as number,
            score: this.rows[i].score.trim(),
            examDate: this.rows[i].date,
        }));
        this.submitted.emit({ file: this.file, results });
    }
}
