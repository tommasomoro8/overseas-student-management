/* ===========================================================================
   Overseas Mobility — store applicativo collegato al backend reale.
   Gestisce navigazione, elenco/dettaglio (con loading/errore) e tutte le azioni
   del workflow, rispettando la macchina a stati del backend.
   =========================================================================== */
import { HttpErrorResponse } from '@angular/common/http';
import { computed, Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import {
    CreateApplicationBody,
    EvaluationDecision,
    ExamMappingInput,
    ExamResultInput,
    PublicApplication,
    PublicInstitution,
    PublicUserSummary,
} from './api.types';
import { mapDetail, mapListItem } from './mappers';
import { Application, Role, Route } from './models';
import { AuthService } from './auth.service';
import { RealtimeService } from './realtime.service';
import { ToastService } from '../ui/toast.service';

function errMsg(e: unknown): string {
    if (e instanceof HttpErrorResponse) {
        const body = e.error as { error?: string } | null;
        if (body && typeof body === 'object' && typeof body.error === 'string') return body.error;
        if (e.status === 0) return 'Server non raggiungibile';
    }
    return 'Si è verificato un errore imprevisto.';
}

function saveBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

@Injectable({ providedIn: 'root' })
export class StoreService {
    private readonly auth = inject(AuthService);
    private readonly api = inject(ApiService);
    private readonly realtime = inject(RealtimeService);
    private readonly toast = inject(ToastService);

    // Cleanup dell'iscrizione realtime alla pratica aperta e all'elenco.
    private watchCleanup: (() => void) | null = null;
    private listWatchCleanup: (() => void) | null = null;

    // Il ruolo deriva dall'utente autenticato.
    readonly role = computed<Role>(() => this.auth.user()?.role ?? 'student');
    readonly route = signal<Route>({ view: 'list', appId: null });

    readonly apps = signal<Application[]>([]);
    readonly current = signal<Application | null>(null);
    readonly listLoading = signal(false);
    readonly detailLoading = signal(false);
    readonly busy = signal(false);
    readonly error = signal<string | null>(null);

    readonly institutions = signal<PublicInstitution[]>([]);
    readonly lecturers = signal<PublicUserSummary[]>([]);

    readonly currentApp = computed(() => this.current());

    // ---- navigazione ----
    go(view: Route['view'], appId?: string | null): void {
        this.route.set({ view, appId: appId ?? null });
    }
    open(id: number): void {
        this.route.set({ view: 'detail', appId: String(id) });
        this.loadDetail(id);
        this.watch(id);
    }
    back(): void {
        this.unwatch();
        this.current.set(null);
        this.route.set({ view: 'list', appId: null });
        this.loadList();
    }

    // ---- caricamento dati ----
    loadList(): void {
        this.ensureListWatch();
        this.listLoading.set(true);
        this.error.set(null);
        this.api.listApplications().subscribe({
            next: (items) => {
                this.apps.set(items.map((i) => mapListItem(i, this.role())));
                this.listLoading.set(false);
            },
            error: (e) => {
                this.error.set(errMsg(e));
                this.listLoading.set(false);
            },
        });
    }

    loadDetail(id: number): void {
        this.detailLoading.set(true);
        this.error.set(null);
        this.api.getApplication(id).subscribe({
            next: (d) => {
                this.current.set(mapDetail(d, this.role()));
                this.detailLoading.set(false);
            },
            error: (e) => {
                this.error.set(errMsg(e));
                this.detailLoading.set(false);
            },
        });
    }

    private reloadCurrent(): void {
        const c = this.current();
        if (c) this.loadDetail(c.numericId);
    }

    // ---- realtime: ricarica "morbida" quando un altro utente aggiorna la pratica ----
    private watch(id: number): void {
        this.unwatch();
        this.watchCleanup = this.realtime.watchApplication(id, () => this.silentReload());
    }
    private unwatch(): void {
        this.watchCleanup?.();
        this.watchCleanup = null;
    }
    /** Ricarica il dettaglio senza spinner di loading (niente sfarfallio) e avvisa l'utente. */
    private silentReload(): void {
        const c = this.current();
        if (!c) return;
        this.api.getApplication(c.numericId).subscribe({
            next: (d) => {
                this.current.set(mapDetail(d, this.role()));
                this.toast.push('Pratica aggiornata');
            },
        });
    }

    // Iscrizione persistente all'elenco: nuove pratiche/transizioni aggiornano la lista
    // anche quando non si e' nel dettaglio. Attivata alla prima loadList().
    private ensureListWatch(): void {
        if (this.listWatchCleanup) return;
        this.listWatchCleanup = this.realtime.watchList(() => {
            if (this.route().view === 'list') this.silentReloadList();
        });
    }
    /** Ricarica l'elenco senza spinner: non svuota la lista, quindi non resetta lo scroll. */
    private silentReloadList(): void {
        this.api.listApplications().subscribe({
            next: (items) => this.apps.set(items.map((i) => mapListItem(i, this.role()))),
        });
    }

    /** Carica i dati di riferimento per il form di creazione (idempotente). */
    ensureRefData(): void {
        if (this.institutions().length === 0) {
            this.api.listInstitutions().subscribe({ next: (i) => this.institutions.set(i) });
        }
        if (this.lecturers().length === 0) {
            this.api.listLecturers().subscribe({ next: (l) => this.lecturers.set(l) });
        }
    }

    // ---- helper azioni: refresh dettaglio dopo ogni transizione ----
    private after<T>(obs: Observable<T>): Observable<T> {
        return obs.pipe(tap(() => this.reloadCurrent()));
    }

    // ---- azioni studente ----
    createApp(body: CreateApplicationBody): Observable<PublicApplication> {
        return this.api.createApplication(body).pipe(
            tap((app) => {
                this.open(app.id);
            }),
        );
    }

    submitLearningAgreement(
        file: File,
        examMappings?: ExamMappingInput[],
        changeDescription?: string,
    ): Observable<PublicApplication> {
        const id = this.requireCurrentId();
        return this.after(
            this.api.submitLearningAgreement(id, file, examMappings, changeDescription),
        );
    }

    setMobilityDates(arrival: string, departure: string): Observable<PublicApplication> {
        const id = this.requireCurrentId();
        return this.after(this.api.setMobilityDates(id, arrival, departure));
    }

    uploadTranscript(file: File, results: ExamResultInput[]): Observable<PublicApplication> {
        const id = this.requireCurrentId();
        return this.after(this.api.uploadTranscript(id, file, results));
    }

    // ---- azioni docente ----
    evaluateLearningAgreement(
        decision: EvaluationDecision,
        reason?: string,
    ): Observable<PublicApplication> {
        const id = this.requireCurrentId();
        const laId = this.current()?.activeLaId;
        if (!laId) throw new Error('Learning Agreement attivo non disponibile');
        return this.after(this.api.evaluateLearningAgreement(id, laId, decision, reason));
    }

    evaluateTranscript(
        decision: EvaluationDecision,
        reason?: string,
    ): Observable<PublicApplication> {
        const id = this.requireCurrentId();
        const torId = this.current()?.activeTorId;
        if (!torId) throw new Error('Transcript attivo non disponibile');
        return this.after(this.api.evaluateTranscript(id, torId, decision, reason));
    }

    // ---- azioni ufficio ----
    approvePreDeparture(): Observable<PublicApplication> {
        const id = this.requireCurrentId();
        return this.after(this.api.preDepartureApproval(id));
    }

    closeApplication(): Observable<PublicApplication> {
        const id = this.requireCurrentId();
        return this.after(this.api.closeApplication(id));
    }

    // ---- download documenti ----
    downloadLearningAgreement(laId: number, fileName: string): void {
        const id = this.requireCurrentId();
        this.api
            .downloadLearningAgreement(id, laId)
            .subscribe({ next: (b) => saveBlob(b, fileName) });
    }
    downloadTranscript(torId: number, fileName: string): void {
        const id = this.requireCurrentId();
        this.api.downloadTranscript(id, torId).subscribe({ next: (b) => saveBlob(b, fileName) });
    }

    errorMessage = errMsg;

    private requireCurrentId(): number {
        const c = this.current();
        if (!c) throw new Error('Nessuna application selezionata');
        return c.numericId;
    }
}
