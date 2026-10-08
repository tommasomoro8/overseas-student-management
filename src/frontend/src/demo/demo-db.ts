/* ===========================================================================
   Overseas Mobility — DEMO: database in memoria.
   Riproduce la logica dei service del backend Express (macchina a stati,
   versioni dei documenti, guardie per ruolo) senza server né PostgreSQL.
   I dati vivono solo nella pagina: ricaricandola si riparte dal seed.
   =========================================================================== */
import {
    ApiRole,
    ApplicationDetail,
    ApplicationListItem,
    ApplicationStatus,
    EvaluationDecision,
    MobilityPeriod,
    PublicApplication,
    PublicDocument,
    PublicEvaluation,
    PublicExamMapping,
    PublicInstitution,
    PublicLearningAgreement,
    PublicUserSummary,
} from '@app/core/api.types';

/** Errore applicativo con status HTTP (equivalente di AppError nel backend). */
export class DemoError extends Error {
    constructor(
        readonly status: number,
        message: string,
        readonly details?: unknown,
    ) {
        super(message);
    }
}

export interface DemoUser extends PublicUserSummary {
    email: string;
    createdAt: string;
}

interface AppRow extends PublicApplication {}

interface EvalRow extends PublicEvaluation {
    documentId: number;
}

interface DocRow {
    id: number;
    applicationId: number;
    fileUrl: string;
    originalName: string;
    versionNumber: number;
    isActive: boolean;
    uploadedAt: string;
    file: Blob;
}

interface LaRow extends DocRow {
    changeDescription: string | null;
}

interface MappingRow extends PublicExamMapping {}

export interface ExamMappingInput {
    foreignCode: string;
    foreignTitle: string;
    foreignCredits: number;
    homeCode: string;
    homeTitle: string;
    homeCredits: number;
}

export interface ExamResultInput {
    examMappingId: number;
    score: string;
    examDate: string;
}

// --- Macchina a stati (copia di backend/src/types/application.types.ts) ---
const ALLOWED_TRANSITIONS: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
    DRAFT: ['LA_SUBMITTED'],
    LA_SUBMITTED: ['LA_APPROVED', 'LA_REJECTED'],
    LA_REJECTED: ['LA_SUBMITTED'],
    LA_APPROVED: ['PRE_DEPARTURE_APPROVED'],
    PRE_DEPARTURE_APPROVED: ['MOBILITY_IN_PROGRESS'],
    MOBILITY_IN_PROGRESS: ['LA_CHANGE_SUBMITTED', 'TOR_SUBMITTED'],
    LA_CHANGE_SUBMITTED: ['MOBILITY_IN_PROGRESS'],
    TOR_SUBMITTED: ['TOR_APPROVED', 'TOR_REJECTED'],
    TOR_REJECTED: ['TOR_SUBMITTED'],
    TOR_APPROVED: ['CLOSED'],
    CLOSED: [],
};

function assertTransition(from: ApplicationStatus, to: ApplicationStatus): void {
    if (!ALLOWED_TRANSITIONS[from].includes(to)) {
        throw new DemoError(409, `Transizione di stato non consentita: ${from} -> ${to}`, {
            from,
            to,
            allowed: ALLOWED_TRANSITIONS[from],
        });
    }
}

// --- Date relative a oggi, così la demo resta plausibile nel tempo ---
const DAY = 24 * 60 * 60 * 1000;
function daysAgo(n: number): string {
    return new Date(Date.now() - n * DAY).toISOString();
}
function dateOnly(offsetDays: number): string {
    return new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10);
}
// Orologio strettamente crescente: due operazioni nello stesso millisecondo
// restano ordinate (serve al seed per ricostruire la cronologia).
let lastTs = 0;
function now(): string {
    lastTs = Math.max(Date.now(), lastTs + 1);
    return new Date(lastTs).toISOString();
}

/** PDF minimo e valido con una riga di testo, usato per i documenti del seed. */
function samplePdf(title: string): Blob {
    const text = title.replace(/[()\\]/g, '');
    const stream = `BT /F1 18 Tf 72 760 Td (${text}) Tj 0 -28 Td /F1 12 Tf (Documento di esempio della demo Overseas Mobility) Tj ET`;
    const objects = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
        `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    ];
    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [];
    objects.forEach((body, i) => {
        offsets.push(pdf.length);
        pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
    });
    const xref = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const o of offsets) pdf += `${String(o).padStart(10, '0')} 00000 n \n`;
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return new Blob([pdf], { type: 'application/pdf' });
}

// --- Seed: utenti, istituzioni (come backend/src/db/seed.ts) ---

/** Gli account aperti dalla schermata iniziale della demo. */
export const DEMO_ACCOUNTS: Record<ApiRole, number> = { student: 1, lecturer: 2, office: 3 };

function seedUsers(): DemoUser[] {
    const createdAt = daysAgo(120);
    const u = (
        id: number,
        email: string,
        role: ApiRole,
        firstName: string,
        lastName: string,
        matriculationNumber: string | null,
    ): DemoUser => ({ id, email, role, firstName, lastName, matriculationNumber, createdAt });
    return [
        u(1, 'studente@unive.it', 'student', 'Marco', 'Rossi', '880101'),
        u(2, 'docente@unive.it', 'lecturer', 'Laura', 'Bianchi', null),
        u(3, 'office@unive.it', 'office', 'Giulia', 'Verdi', null),
        u(4, 'sara.conti@unive.it', 'student', 'Sara', 'Conti', '880214'),
        u(5, 'luca.ferri@unive.it', 'student', 'Luca', 'Ferri', '879932'),
        u(6, 'elena.galli@unive.it', 'student', 'Elena', 'Galli', '881057'),
        u(7, 'paolo.neri@unive.it', 'lecturer', 'Paolo', 'Neri', null),
        u(8, 'anna.colombo@unive.it', 'lecturer', 'Anna', 'Colombo', null),
    ];
}

const FLAGS: Record<string, string> = {
    Spagna: '🇪🇸',
    Francia: '🇫🇷',
    Germania: '🇩🇪',
    Portogallo: '🇵🇹',
    'Paesi Bassi': '🇳🇱',
    Belgio: '🇧🇪',
    Giappone: '🇯🇵',
    Cina: '🇨🇳',
    'Stati Uniti': '🇺🇸',
    Canada: '🇨🇦',
    Australia: '🇦🇺',
    Brasile: '🇧🇷',
    Singapore: '🇸🇬',
    'Regno Unito': '🇬🇧',
};

function seedInstitutions(): PublicInstitution[] {
    const rows: [string, string, string, string][] = [
        ['Universitat de Barcelona', 'Spagna', 'Barcellona', 'E BARCELO01'],
        ['Universite Paris-Saclay', 'Francia', 'Parigi', 'F PARIS481'],
        ['Technische Universitat Munchen', 'Germania', 'Monaco di Baviera', 'D MUNCHEN02'],
        ['Universiteit van Amsterdam', 'Paesi Bassi', 'Amsterdam', 'NL AMSTERD01'],
        ['Universidade de Lisboa', 'Portogallo', 'Lisbona', 'P LISBOA109'],
        ['KU Leuven', 'Belgio', 'Lovanio', 'B LEUVEN01'],
        ['University of Edinburgh', 'Regno Unito', 'Edimburgo', 'UK EDINBUR01'],
        ['University of Tokyo', 'Giappone', 'Tokyo', 'JP TOKYO01'],
        ['Columbia University', 'Stati Uniti', 'New York', 'US NEWYORK07'],
        ['University of Toronto', 'Canada', 'Toronto', 'CA TORONTO01'],
        ['University of Melbourne', 'Australia', 'Melbourne', 'AU MELBOUR01'],
        ['Tsinghua University', 'Cina', 'Pechino', 'CN BEIJING01'],
        ['National University of Singapore', 'Singapore', 'Singapore', 'SG SINGAP01'],
        ['Universidade de Sao Paulo', 'Brasile', 'San Paolo', 'BR SAOPAUL01'],
    ];
    const createdAt = daysAgo(120);
    return rows.map(([name, country, city, erasmusCode], i) => ({
        id: i + 1,
        name,
        country,
        city,
        erasmusCode,
        flag: FLAGS[country] ?? '🌍',
        createdAt,
        updatedAt: createdAt,
    }));
}

// Piani esami di esempio (estero -> Ca' Foscari)
const PLAN_A: ExamMappingInput[] = [
    {
        foreignCode: 'CS-310',
        foreignTitle: 'Distributed Systems',
        foreignCredits: 8,
        homeCode: 'CT0573',
        homeTitle: 'Sistemi distribuiti',
        homeCredits: 6,
    },
    {
        foreignCode: 'CS-342',
        foreignTitle: 'Web Engineering',
        foreignCredits: 8,
        homeCode: 'CT0142',
        homeTitle: 'Tecnologie e applicazioni web',
        homeCredits: 6,
    },
    {
        foreignCode: 'MA-221',
        foreignTitle: 'Probability and Statistics',
        foreignCredits: 6,
        homeCode: 'CT0111',
        homeTitle: 'Calcolo delle probabilità e statistica',
        homeCredits: 6,
    },
];
const PLAN_B: ExamMappingInput[] = [
    {
        foreignCode: 'COMP-4410',
        foreignTitle: 'Machine Learning',
        foreignCredits: 6,
        homeCode: 'CT0435',
        homeTitle: 'Machine learning',
        homeCredits: 6,
    },
    {
        foreignCode: 'COMP-3120',
        foreignTitle: 'Computer Networks',
        foreignCredits: 6,
        homeCode: 'CT0126',
        homeTitle: 'Reti di calcolatori',
        homeCredits: 6,
    },
];

// --- Il "database" ---

export class DemoDb {
    private users = seedUsers();
    private institutions = seedInstitutions();
    private apps: AppRow[] = [];
    private las: LaRow[] = [];
    private tors: DocRow[] = [];
    private mappings: MappingRow[] = [];
    private laEvals: EvalRow[] = [];
    private torEvals: EvalRow[] = [];
    private seq = { app: 0, doc: 0, mapping: 0, evaluation: 0, file: 0 };

    constructor() {
        this.seedApplications();
    }

    // ---------- utenti / riferimenti ----------

    findUser(id: number): DemoUser | undefined {
        return this.users.find((u) => u.id === id);
    }

    private summary(id: number): PublicUserSummary | null {
        const u = this.findUser(id);
        if (!u) return null;
        return {
            id: u.id,
            firstName: u.firstName,
            lastName: u.lastName,
            matriculationNumber: u.matriculationNumber,
            role: u.role,
        };
    }

    listLecturers(): PublicUserSummary[] {
        return this.users
            .filter((u) => u.role === 'lecturer')
            .sort((a, b) => (a.lastName + a.firstName).localeCompare(b.lastName + b.firstName))
            .map((u) => this.summary(u.id)!);
    }

    listInstitutions(): PublicInstitution[] {
        return [...this.institutions].sort((a, b) => a.name.localeCompare(b.name));
    }

    private institution(id: number): PublicInstitution | null {
        return this.institutions.find((i) => i.id === id) ?? null;
    }

    // ---------- guardie ----------

    private loadApp(id: number): AppRow {
        const app = this.apps.find((a) => a.id === id);
        if (!app) throw new DemoError(404, 'Domanda non trovata');
        return app;
    }

    private loadReadable(id: number, user: DemoUser): AppRow {
        const app = this.loadApp(id);
        const ok =
            user.role === 'office' ||
            (user.role === 'student' && app.studentId === user.id) ||
            (user.role === 'lecturer' && app.referentLecturerId === user.id);
        if (!ok) throw new DemoError(403, 'Non hai i permessi per accedere a questa domanda');
        return app;
    }

    private assertOwner(app: AppRow, user: DemoUser): void {
        if (!(user.role === 'student' && app.studentId === user.id)) {
            throw new DemoError(
                403,
                "Solo lo studente proprietario puo' eseguire questa operazione",
            );
        }
    }

    private assertReferent(app: AppRow, user: DemoUser): void {
        if (!(user.role === 'lecturer' && app.referentLecturerId === user.id)) {
            throw new DemoError(403, "Solo il docente referente puo' valutare questa domanda");
        }
    }

    private setStatus(app: AppRow, status: ApplicationStatus): void {
        app.status = status;
        app.updatedAt = now();
    }

    private publicApp(app: AppRow): PublicApplication {
        return { ...app };
    }

    // ---------- lettura ----------

    listApplications(user: DemoUser, status: ApplicationStatus | null): ApplicationListItem[] {
        return this.apps
            .filter((a) =>
                user.role === 'student'
                    ? a.studentId === user.id
                    : user.role === 'lecturer'
                      ? a.referentLecturerId === user.id
                      : true,
            )
            .filter((a) => !status || a.status === status)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .map((a) => ({
                ...this.publicApp(a),
                institution: this.institution(a.hostInstitutionId),
                student: this.summary(a.studentId),
                lecturer: this.summary(a.referentLecturerId),
            }));
    }

    private evalOf(list: EvalRow[], docId: number): PublicEvaluation | null {
        const e = list.filter((x) => x.documentId === docId).pop();
        if (!e) return null;
        const { documentId: _ignored, ...pub } = e;
        return pub;
    }

    private mappingsOf(laId: number): MappingRow[] {
        return this.mappings
            .filter((m) => m.learningAgreementId === laId)
            .sort((a, b) => a.id - b.id);
    }

    private publicDoc(d: DocRow, evaluation: PublicEvaluation | null): PublicDocument {
        return {
            id: d.id,
            applicationId: d.applicationId,
            fileUrl: d.fileUrl,
            originalName: d.originalName,
            versionNumber: d.versionNumber,
            isActive: d.isActive,
            uploadedAt: d.uploadedAt,
            evaluation,
        };
    }

    private publicLa(d: LaRow): PublicLearningAgreement {
        return {
            ...this.publicDoc(d, this.evalOf(this.laEvals, d.id)),
            changeDescription: d.changeDescription,
            examMappings: this.mappingsOf(d.id).map((m) => ({ ...m })),
        };
    }

    getApplicationDetail(id: number, user: DemoUser): ApplicationDetail {
        const app = this.loadReadable(id, user);
        const las = this.las
            .filter((d) => d.applicationId === id)
            .sort((a, b) => a.versionNumber - b.versionNumber);
        const tors = this.tors
            .filter((d) => d.applicationId === id)
            .sort((a, b) => a.versionNumber - b.versionNumber);
        const active = las.find((d) => d.isActive);
        return {
            ...this.publicApp(app),
            institution: this.institution(app.hostInstitutionId),
            student: this.summary(app.studentId),
            lecturer: this.summary(app.referentLecturerId),
            learningAgreements: las.map((d) => this.publicLa(d)),
            transcripts: tors.map((d) => this.publicDoc(d, this.evalOf(this.torEvals, d.id))),
            activeExamMappings: active ? this.mappingsOf(active.id).map((m) => ({ ...m })) : [],
        };
    }

    getFile(appId: number, docId: number, kind: 'la' | 'tor', user: DemoUser): Blob {
        this.loadReadable(appId, user);
        const list: DocRow[] = kind === 'la' ? this.las : this.tors;
        const doc = list.find((d) => d.id === docId && d.applicationId === appId);
        if (!doc) {
            throw new DemoError(
                404,
                kind === 'la' ? 'Learning Agreement non trovato' : 'Transcript non trovato',
            );
        }
        return doc.file;
    }

    // ---------- domanda ----------

    createApplication(
        user: DemoUser,
        input: {
            referentLecturerId: number;
            hostInstitutionId: number;
            academicYear: string;
            expectedPeriod: MobilityPeriod;
        },
        createdAt = now(),
    ): PublicApplication {
        const lecturer = this.findUser(input.referentLecturerId);
        if (!lecturer || lecturer.role !== 'lecturer') {
            throw new DemoError(400, 'Il referente indicato deve essere un docente valido');
        }
        if (!this.institution(input.hostInstitutionId)) {
            throw new DemoError(400, 'Istituzione ospitante non valida');
        }
        const app: AppRow = {
            id: ++this.seq.app,
            studentId: user.id,
            referentLecturerId: input.referentLecturerId,
            hostInstitutionId: input.hostInstitutionId,
            academicYear: input.academicYear,
            expectedPeriod: input.expectedPeriod,
            status: 'DRAFT',
            actualArrivalDate: null,
            actualDepartureDate: null,
            mobilityDatesInsertedAt: null,
            preDepartureApprovedAt: null,
            closedAt: null,
            createdAt,
            updatedAt: createdAt,
        };
        this.apps.push(app);
        return this.publicApp(app);
    }

    approvePreDeparture(id: number): PublicApplication {
        const app = this.loadApp(id);
        assertTransition(app.status, 'PRE_DEPARTURE_APPROVED');
        this.setStatus(app, 'PRE_DEPARTURE_APPROVED');
        app.preDepartureApprovedAt = app.updatedAt;
        return this.publicApp(app);
    }

    closeApplication(id: number): PublicApplication {
        const app = this.loadApp(id);
        assertTransition(app.status, 'CLOSED');
        this.setStatus(app, 'CLOSED');
        app.closedAt = app.updatedAt;
        return this.publicApp(app);
    }

    insertMobilityDates(
        id: number,
        user: DemoUser,
        arrival: string,
        departure: string,
    ): PublicApplication {
        const app = this.loadApp(id);
        this.assertOwner(app, user);
        if (app.status === 'PRE_DEPARTURE_APPROVED') {
            assertTransition(app.status, 'MOBILITY_IN_PROGRESS');
            this.setStatus(app, 'MOBILITY_IN_PROGRESS');
            app.mobilityDatesInsertedAt = app.updatedAt;
        } else if (
            app.status === 'MOBILITY_IN_PROGRESS' ||
            app.status === 'LA_CHANGE_SUBMITTED' ||
            app.status === 'TOR_SUBMITTED' ||
            app.status === 'TOR_REJECTED'
        ) {
            app.updatedAt = now();
        } else {
            throw new DemoError(
                409,
                "Le date di mobilita' si possono inserire solo dopo l'approvazione pre-partenza",
            );
        }
        app.actualArrivalDate = arrival;
        app.actualDepartureDate = departure;
        return this.publicApp(app);
    }

    // ---------- Learning Agreement ----------

    private newDoc(appId: number, list: DocRow[], file: Blob, originalName: string): DocRow {
        const versions = list.filter((d) => d.applicationId === appId);
        for (const d of versions) d.isActive = false;
        return {
            id: ++this.seq.doc,
            applicationId: appId,
            fileUrl: `demo-${++this.seq.file}.pdf`,
            originalName,
            versionNumber: versions.reduce((max, d) => Math.max(max, d.versionNumber), 0) + 1,
            isActive: true,
            uploadedAt: now(),
            file,
        };
    }

    private addMappings(laId: number, rows: ExamMappingInput[]): void {
        const ts = now();
        for (const r of rows) {
            this.mappings.push({
                id: ++this.seq.mapping,
                learningAgreementId: laId,
                ...r,
                score: null,
                examDate: null,
                createdAt: ts,
                updatedAt: ts,
            });
        }
    }

    submitLearningAgreement(
        id: number,
        user: DemoUser,
        file: Blob,
        originalName: string,
        examMappings: ExamMappingInput[] | undefined,
        changeDescription: string | undefined,
    ): { learningAgreement: PublicLearningAgreement; application: PublicApplication } {
        const app = this.loadApp(id);
        this.assertOwner(app, user);

        let target: 'LA_SUBMITTED' | 'LA_CHANGE_SUBMITTED';
        if (app.status === 'DRAFT' || app.status === 'LA_REJECTED') {
            target = 'LA_SUBMITTED';
        } else if (app.status === 'MOBILITY_IN_PROGRESS') {
            target = 'LA_CHANGE_SUBMITTED';
        } else {
            throw new DemoError(
                409,
                `Non e' possibile inviare un Learning Agreement nello stato ${app.status}`,
            );
        }
        assertTransition(app.status, target);

        const previous = this.las.find((d) => d.applicationId === id && d.isActive);
        if (!previous && (!examMappings || examMappings.length === 0)) {
            throw new DemoError(
                400,
                "Il mapping degli esami e' obbligatorio al primo invio del Learning Agreement",
            );
        }
        if (target === 'LA_CHANGE_SUBMITTED' && !changeDescription) {
            throw new DemoError(
                400,
                "La descrizione della modifica e' obbligatoria durante la mobilita'",
            );
        }

        const la: LaRow = {
            ...this.newDoc(id, this.las, file, originalName),
            changeDescription:
                target === 'LA_CHANGE_SUBMITTED' ? (changeDescription ?? null) : null,
        };
        this.las.push(la);
        if (examMappings && examMappings.length > 0) {
            this.addMappings(la.id, examMappings);
        } else if (previous) {
            // eredita il mapping della versione precedente, senza voti né date
            this.addMappings(
                la.id,
                this.mappingsOf(previous.id).map((m) => ({
                    foreignCode: m.foreignCode,
                    foreignTitle: m.foreignTitle,
                    foreignCredits: m.foreignCredits,
                    homeCode: m.homeCode,
                    homeTitle: m.homeTitle,
                    homeCredits: m.homeCredits,
                })),
            );
        }
        this.setStatus(app, target);
        return { learningAgreement: this.publicLa(la), application: this.publicApp(app) };
    }

    private addEval(
        list: EvalRow[],
        docId: number,
        user: DemoUser,
        decision: EvaluationDecision,
        reason: string | null,
    ): PublicEvaluation {
        list.push({
            id: ++this.seq.evaluation,
            documentId: docId,
            lecturerId: user.id,
            decision,
            reason,
            evaluatedAt: now(),
        });
        return this.evalOf(list, docId)!;
    }

    evaluateLearningAgreement(
        id: number,
        laId: number,
        user: DemoUser,
        decision: EvaluationDecision,
        reason: string | null,
    ): { evaluation: PublicEvaluation; application: PublicApplication } {
        const app = this.loadApp(id);
        this.assertReferent(app, user);
        const la = this.las.find((d) => d.id === laId && d.applicationId === id);
        if (!la) throw new DemoError(404, 'Learning Agreement non trovato');
        if (!la.isActive) {
            throw new DemoError(409, "Questa versione non e' piu' attiva: valuta l'ultima inviata");
        }

        if (app.status === 'LA_SUBMITTED') {
            const target = decision === 'APPROVED' ? 'LA_APPROVED' : 'LA_REJECTED';
            assertTransition(app.status, target);
            const evaluation = this.addEval(this.laEvals, la.id, user, decision, reason);
            this.setStatus(app, target);
            return { evaluation, application: this.publicApp(app) };
        }

        if (app.status === 'LA_CHANGE_SUBMITTED') {
            assertTransition(app.status, 'MOBILITY_IN_PROGRESS');
            const evaluation = this.addEval(this.laEvals, la.id, user, decision, reason);
            if (decision === 'REJECTED') {
                // ripristino: disattiva la modifica rifiutata e riattiva la versione precedente
                const previous = this.las
                    .filter((d) => d.applicationId === id && d.versionNumber < la.versionNumber)
                    .sort((a, b) => b.versionNumber - a.versionNumber)[0];
                if (!previous)
                    throw new DemoError(500, 'Versione precedente da ripristinare non trovata');
                la.isActive = false;
                previous.isActive = true;
            }
            this.setStatus(app, 'MOBILITY_IN_PROGRESS');
            return { evaluation, application: this.publicApp(app) };
        }

        throw new DemoError(
            409,
            `Non e' possibile valutare il Learning Agreement nello stato ${app.status}`,
        );
    }

    // ---------- Transcript of Records ----------

    uploadTranscript(
        id: number,
        user: DemoUser,
        file: Blob,
        originalName: string,
        results: ExamResultInput[],
    ): { transcript: PublicDocument; application: PublicApplication } {
        const app = this.loadApp(id);
        this.assertOwner(app, user);
        assertTransition(app.status, 'TOR_SUBMITTED');

        const active = this.las.find((d) => d.applicationId === id && d.isActive);
        if (!active) throw new DemoError(500, 'Versione attiva del Learning Agreement mancante');
        const mappings = this.mappingsOf(active.id);
        const ids = new Set(mappings.map((m) => m.id));
        const provided = new Set<number>();
        for (const r of results) {
            if (!ids.has(r.examMappingId)) {
                throw new DemoError(
                    400,
                    `L'esame ${r.examMappingId} non appartiene al Learning Agreement attivo`,
                );
            }
            provided.add(r.examMappingId);
        }
        if (provided.size !== ids.size) {
            throw new DemoError(
                400,
                'Vanno forniti voto e data per tutti gli esami del Learning Agreement',
            );
        }

        const tor = this.newDoc(id, this.tors, file, originalName);
        this.tors.push(tor);
        const ts = now();
        for (const r of results) {
            const m = mappings.find((x) => x.id === r.examMappingId)!;
            m.score = r.score;
            m.examDate = r.examDate;
            m.updatedAt = ts;
        }
        this.setStatus(app, 'TOR_SUBMITTED');
        return { transcript: this.publicDoc(tor, null), application: this.publicApp(app) };
    }

    evaluateTranscript(
        id: number,
        torId: number,
        user: DemoUser,
        decision: EvaluationDecision,
        reason: string | null,
    ): { evaluation: PublicEvaluation; application: PublicApplication } {
        const app = this.loadApp(id);
        this.assertReferent(app, user);
        const tor = this.tors.find((d) => d.id === torId && d.applicationId === id);
        if (!tor) throw new DemoError(404, 'Transcript non trovato');
        if (!tor.isActive) {
            throw new DemoError(
                409,
                "Questa versione non e' piu' attiva: valuta l'ultima caricata",
            );
        }
        const target = decision === 'APPROVED' ? 'TOR_APPROVED' : 'TOR_REJECTED';
        assertTransition(app.status, target);
        if (decision === 'APPROVED') {
            const active = this.las.find((d) => d.applicationId === id && d.isActive);
            const mappings = active ? this.mappingsOf(active.id) : [];
            if (mappings.length === 0 || mappings.some((m) => !m.score || !m.examDate)) {
                throw new DemoError(
                    409,
                    'Tutti gli esami devono avere voto e data prima di approvare il Transcript',
                );
            }
        }
        const evaluation = this.addEval(this.torEvals, tor.id, user, decision, reason);
        this.setStatus(app, target);
        return { evaluation, application: this.publicApp(app) };
    }

    // ---------- seed delle pratiche ----------

    /**
     * Porta le pratiche di esempio nei vari stati usando le stesse operazioni
     * dell'interfaccia, poi retrodata i timestamp per una timeline realistica.
     */
    private seedApplications(): void {
        const u = (id: number) => this.findUser(id)!;
        const student = u(1);
        const lecturer = u(2);
        const office = u(3);
        const sara = u(4);
        const luca = u(5);
        const elena = u(6);
        const neri = u(7);
        void office;

        const create = (
            s: DemoUser,
            lect: number,
            inst: number,
            period: MobilityPeriod,
            age: number,
            year = '2026/2027',
        ) =>
            this.createApplication(
                s,
                {
                    referentLecturerId: lect,
                    hostInstitutionId: inst,
                    academicYear: year,
                    expectedPeriod: period,
                },
                daysAgo(age),
            ).id;
        const la = (id: number, s: DemoUser, plan?: ExamMappingInput[], change?: string) =>
            this.submitLearningAgreement(
                id,
                s,
                samplePdf('Learning Agreement'),
                change ? 'Learning_Agreement_modifica.pdf' : 'Learning_Agreement.pdf',
                plan,
                change,
            );
        const evalLa = (
            id: number,
            by: DemoUser,
            decision: EvaluationDecision,
            reason: string | null = null,
        ) => {
            const active = this.las.find((d) => d.applicationId === id && d.isActive)!;
            this.evaluateLearningAgreement(id, active.id, by, decision, reason);
        };
        const tor = (id: number, s: DemoUser, scores: string[]) => {
            const active = this.las.find((d) => d.applicationId === id && d.isActive)!;
            const results = this.mappingsOf(active.id).map((m, i) => ({
                examMappingId: m.id,
                score: scores[i % scores.length],
                examDate: dateOnly(-30 - i * 7),
            }));
            this.uploadTranscript(
                id,
                s,
                samplePdf('Transcript of Records'),
                'Transcript_of_Records.pdf',
                results,
            );
        };
        const evalTor = (id: number, by: DemoUser, decision: EvaluationDecision) => {
            const active = this.tors.find((d) => d.applicationId === id && d.isActive)!;
            this.evaluateTranscript(id, active.id, by, decision, null);
        };

        // Luca Ferri: pratica conclusa (anno precedente)
        const closed = create(luca, neri.id, 9, 'FIRST_SEMESTER', 400, '2025/2026');
        la(closed, luca, PLAN_A);
        evalLa(closed, neri, 'APPROVED');
        this.approvePreDeparture(closed);
        this.insertMobilityDates(closed, luca, dateOnly(-330), dateOnly(-190));
        tor(closed, luca, ['28', '30L', '27']);
        evalTor(closed, neri, 'APPROVED');
        this.closeApplication(closed);

        // Luca Ferri: Transcript approvato, l'ufficio può chiudere
        const torApproved = create(luca, lecturer.id, 14, 'SECOND_SEMESTER', 260, '2025/2026');
        la(torApproved, luca, PLAN_B);
        evalLa(torApproved, lecturer, 'APPROVED');
        this.approvePreDeparture(torApproved);
        this.insertMobilityDates(torApproved, luca, dateOnly(-200), dateOnly(-40));
        tor(torApproved, luca, ['29', '26']);
        evalTor(torApproved, lecturer, 'APPROVED');

        // Marco Rossi: Transcript inviato, il docente deve valutarlo
        const torSubmitted = create(student, lecturer.id, 13, 'FIRST_SEMESTER', 240, '2025/2026');
        la(torSubmitted, student, PLAN_B);
        evalLa(torSubmitted, lecturer, 'APPROVED');
        this.approvePreDeparture(torSubmitted);
        this.insertMobilityDates(torSubmitted, student, dateOnly(-210), dateOnly(-25));
        tor(torSubmitted, student, ['30', '27']);

        // Sara Conti: LA rifiutato, deve reinviarlo
        const rejected = create(sara, neri.id, 9, 'FULL_YEAR', 70);
        la(rejected, sara, PLAN_A);
        evalLa(
            rejected,
            neri,
            'REJECTED',
            'Distributed Systems vale 8 crediti: indica un secondo esame da 6 crediti da abbinare.',
        );

        // Elena Galli: modifica al piano in valutazione durante la mobilità
        const changeSubmitted = create(elena, lecturer.id, 8, 'FIRST_SEMESTER', 150);
        la(changeSubmitted, elena, PLAN_A);
        evalLa(changeSubmitted, lecturer, 'APPROVED');
        this.approvePreDeparture(changeSubmitted);
        this.insertMobilityDates(changeSubmitted, elena, dateOnly(-35), dateOnly(110));
        la(
            changeSubmitted,
            elena,
            [
                PLAN_A[0],
                {
                    foreignCode: 'CS-355',
                    foreignTitle: 'Cloud Computing',
                    foreignCredits: 8,
                    homeCode: 'CT0142',
                    homeTitle: 'Tecnologie e applicazioni web',
                    homeCredits: 6,
                },
                PLAN_A[2],
            ],
            'Web Engineering non è più attivo nel primo semestre: lo sostituisco con Cloud Computing.',
        );

        // Marco Rossi: mobilità in corso
        const inMobility = create(student, lecturer.id, 9, 'FIRST_SEMESTER', 130);
        la(inMobility, student, PLAN_A);
        evalLa(inMobility, lecturer, 'APPROVED');
        this.approvePreDeparture(inMobility);
        this.insertMobilityDates(inMobility, student, dateOnly(-30), dateOnly(120));

        // Sara Conti: LA approvato, l'ufficio deve verificare la pre-partenza
        const laApproved = create(sara, lecturer.id, 12, 'SECOND_SEMESTER', 60);
        la(laApproved, sara, PLAN_B);
        evalLa(laApproved, lecturer, 'APPROVED');

        // Marco Rossi: pre-partenza approvata, deve inserire le date
        const preDeparture = create(student, lecturer.id, 11, 'SECOND_SEMESTER', 45);
        la(preDeparture, student, PLAN_B);
        evalLa(preDeparture, lecturer, 'APPROVED');
        this.approvePreDeparture(preDeparture);

        // Marco Rossi: LA inviato, in attesa del docente
        const laSubmitted = create(student, lecturer.id, 10, 'FULL_YEAR', 20);
        la(laSubmitted, student, PLAN_A);

        // Marco Rossi: bozza appena creata
        create(student, lecturer.id, 8, 'SECOND_SEMESTER', 3);

        this.backdate();
    }

    /**
     * Le operazioni del seed hanno tutte il timestamp di "adesso": le distribuisce
     * tra la creazione di ogni pratica e oggi, nell'ordine in cui sono avvenute.
     */
    private backdate(): void {
        for (const app of this.apps) {
            const start = Date.parse(app.createdAt);
            const end = Date.now() - DAY;
            const events: { get: () => string; set: (v: string) => void }[] = [];
            const field = <T extends object>(obj: T, key: keyof T) => {
                if (obj[key]) {
                    events.push({
                        get: () => obj[key] as string,
                        set: (v) => ((obj[key] as string) = v),
                    });
                }
            };
            for (const d of this.las.filter((x) => x.applicationId === app.id)) {
                field(d, 'uploadedAt');
                for (const e of this.laEvals.filter((x) => x.documentId === d.id))
                    field(e, 'evaluatedAt');
            }
            field(app, 'preDepartureApprovedAt');
            field(app, 'mobilityDatesInsertedAt');
            for (const d of this.tors.filter((x) => x.applicationId === app.id)) {
                field(d, 'uploadedAt');
                for (const e of this.torEvals.filter((x) => x.documentId === d.id))
                    field(e, 'evaluatedAt');
            }
            field(app, 'closedAt');
            // ordine cronologico reale (le operazioni sono state eseguite in sequenza)
            events.sort((a, b) => a.get().localeCompare(b.get()));
            const step = (end - start) / (events.length + 1);
            events.forEach((ev, i) => ev.set(new Date(start + step * (i + 1)).toISOString()));
            const last = events.length ? events[events.length - 1].get() : app.createdAt;
            app.updatedAt = last;
            for (const m of this.mappings) {
                const d = this.las.find((x) => x.id === m.learningAgreementId);
                if (d?.applicationId === app.id) {
                    m.createdAt = d.uploadedAt;
                    m.updatedAt = m.score ? last : d.uploadedAt;
                }
            }
        }
    }
}
