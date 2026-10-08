/* ===========================================================================
   Overseas Mobility — DEMO: backend simulato.
   Intercetta le chiamate a /api/v1 e le risolve sul database in memoria
   (DemoDb), restituendo gli stessi JSON e gli stessi codici di stato del
   backend Express. Nessuna richiesta lascia il browser.
   =========================================================================== */
import {
    HttpErrorResponse,
    HttpInterceptorFn,
    HttpRequest,
    HttpResponse,
} from '@angular/common/http';
import { Observable, delay, of, throwError } from 'rxjs';
import {
    ApiRole,
    ApplicationStatus,
    EvaluationDecision,
    MobilityPeriod,
} from '@app/core/api.types';
import {
    DEMO_ACCOUNTS,
    DemoDb,
    DemoError,
    DemoUser,
    ExamMappingInput,
    ExamResultInput,
} from '@demo/demo-db';

const db = new DemoDb();
const LATENCY_MS = 150;
const TOKEN_PREFIX = 'demo-token-';

/** Token "finto" per l'account scelto nella schermata iniziale. */
export function demoLogin(role: ApiRole): { user: DemoUser; token: string } {
    const user = db.findUser(DEMO_ACCOUNTS[role])!;
    return { user, token: TOKEN_PREFIX + user.id };
}

type Handler = (req: HttpRequest<unknown>, user: DemoUser, params: number[]) => unknown;

interface Route {
    method: string;
    pattern: RegExp;
    status?: number;
    roles?: ApiRole[];
    handle: Handler;
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const PERIODS: MobilityPeriod[] = ['FIRST_SEMESTER', 'SECOND_SEMESTER', 'FULL_YEAR'];

function invalid(field: string, message: string): never {
    throw new DemoError(400, 'Dati di input non validi', [{ field, message }]);
}

function body(req: HttpRequest<unknown>): Record<string, unknown> {
    return (req.body ?? {}) as Record<string, unknown>;
}

/** Equivalente di multer + parseJsonFields: estrae il PDF e i campi JSON dal FormData. */
function multipart(
    req: HttpRequest<unknown>,
    jsonFields: string[],
): { file: File; fields: Record<string, unknown> } {
    const fd = req.body as FormData;
    const file = fd.get('file');
    if (!(file instanceof File)) invalid('file', 'File PDF mancante');
    if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
        throw new DemoError(400, 'Sono ammessi solo file PDF');
    }
    if (file.size > MAX_UPLOAD_BYTES) throw new DemoError(400, 'Upload non valido: File too large');
    const fields: Record<string, unknown> = {};
    fd.forEach((value, key) => {
        if (key === 'file' || typeof value !== 'string') return;
        if (jsonFields.includes(key) && value.trim() !== '') {
            try {
                fields[key] = JSON.parse(value);
            } catch {
                throw new DemoError(400, `Campo "${key}": JSON non valido`);
            }
        } else {
            fields[key] = value;
        }
    });
    return { file, fields };
}

function evaluation(req: HttpRequest<unknown>): {
    decision: EvaluationDecision;
    reason: string | null;
} {
    const b = body(req);
    if (b['decision'] !== 'APPROVED' && b['decision'] !== 'REJECTED') {
        invalid('decision', "La decisione deve essere 'APPROVED' o 'REJECTED'");
    }
    const reason =
        typeof b['reason'] === 'string' && b['reason'].trim() ? b['reason'].trim() : null;
    if (b['decision'] === 'REJECTED' && !reason) {
        invalid('reason', "La motivazione e' obbligatoria in caso di rifiuto");
    }
    return { decision: b['decision'] as EvaluationDecision, reason };
}

function examMappings(value: unknown): ExamMappingInput[] | undefined {
    if (value === undefined) return undefined;
    if (!Array.isArray(value) || value.length === 0) {
        invalid('examMappings', 'Inserire almeno una corrispondenza esame');
    }
    return value.map((row: Record<string, unknown>, i) => {
        for (const k of ['foreignCode', 'foreignTitle', 'homeCode', 'homeTitle']) {
            if (typeof row[k] !== 'string' || !(row[k] as string).trim())
                invalid(`examMappings.${i}.${k}`, 'Campo obbligatorio');
        }
        for (const k of ['foreignCredits', 'homeCredits']) {
            if (typeof row[k] !== 'number' || (row[k] as number) < 0 || (row[k] as number) > 999) {
                invalid(`examMappings.${i}.${k}`, 'Numero di crediti non valido');
            }
        }
        return {
            foreignCode: (row['foreignCode'] as string).trim(),
            foreignTitle: (row['foreignTitle'] as string).trim(),
            foreignCredits: row['foreignCredits'] as number,
            homeCode: (row['homeCode'] as string).trim(),
            homeTitle: (row['homeTitle'] as string).trim(),
            homeCredits: row['homeCredits'] as number,
        };
    });
}

function examResults(value: unknown): ExamResultInput[] {
    if (!Array.isArray(value) || value.length === 0)
        invalid('results', 'Inserire i voti degli esami');
    return value.map((r: Record<string, unknown>, i) => {
        if (typeof r['examMappingId'] !== 'number')
            invalid(`results.${i}.examMappingId`, 'Id mapping esame non valido');
        if (typeof r['score'] !== 'string' || !r['score'].trim())
            invalid(`results.${i}.score`, 'Voto obbligatorio');
        if (typeof r['examDate'] !== 'string' || !ISO_DATE.test(r['examDate'])) {
            invalid(`results.${i}.examDate`, 'Data esame non valida (formato AAAA-MM-GG)');
        }
        return {
            examMappingId: r['examMappingId'] as number,
            score: (r['score'] as string).trim(),
            examDate: r['examDate'] as string,
        };
    });
}

// Stesse rotte, ruoli e codici di stato di backend/src/routes/*.ts
const ROUTES: Route[] = [
    {
        method: 'GET',
        pattern: /^\/users\/lecturers$/,
        handle: () => ({ lecturers: db.listLecturers() }),
    },
    {
        method: 'GET',
        pattern: /^\/institutions$/,
        handle: () => ({ institutions: db.listInstitutions() }),
    },
    {
        method: 'GET',
        pattern: /^\/applications$/,
        handle: (req, user) => ({
            applications: db.listApplications(
                user,
                (req.params.get('status') as ApplicationStatus | null) ?? null,
            ),
        }),
    },
    {
        method: 'POST',
        pattern: /^\/applications$/,
        status: 201,
        roles: ['student'],
        handle: (req, user) => {
            const b = body(req);
            const year = typeof b['academicYear'] === 'string' ? b['academicYear'].trim() : '';
            if (!/^\d{4}\/\d{4}$/.test(year))
                invalid('academicYear', 'Anno accademico nel formato AAAA/AAAA (es. 2025/2026)');
            if (!PERIODS.includes(b['expectedPeriod'] as MobilityPeriod))
                invalid('expectedPeriod', 'Periodo previsto non valido');
            if (!Number.isInteger(b['referentLecturerId']))
                invalid('referentLecturerId', 'Referente non valido');
            if (!Number.isInteger(b['hostInstitutionId']))
                invalid('hostInstitutionId', 'Istituzione non valida');
            return {
                application: db.createApplication(user, {
                    referentLecturerId: b['referentLecturerId'] as number,
                    hostInstitutionId: b['hostInstitutionId'] as number,
                    academicYear: year,
                    expectedPeriod: b['expectedPeriod'] as MobilityPeriod,
                }),
            };
        },
    },
    {
        method: 'GET',
        pattern: /^\/applications\/(\d+)$/,
        handle: (_r, user, [id]) => ({ application: db.getApplicationDetail(id, user) }),
    },
    {
        method: 'POST',
        pattern: /^\/applications\/(\d+)\/pre-departure-approval$/,
        roles: ['office'],
        handle: (_r, _u, [id]) => ({ application: db.approvePreDeparture(id) }),
    },
    {
        method: 'POST',
        pattern: /^\/applications\/(\d+)\/close$/,
        roles: ['office'],
        handle: (_r, _u, [id]) => ({ application: db.closeApplication(id) }),
    },
    {
        method: 'POST',
        pattern: /^\/applications\/(\d+)\/mobility-dates$/,
        roles: ['student'],
        handle: (req, user, [id]) => {
            const b = body(req);
            const arrival = b['actualArrivalDate'];
            const departure = b['actualDepartureDate'];
            if (typeof arrival !== 'string' || !ISO_DATE.test(arrival))
                invalid('actualArrivalDate', 'Data non valida (formato AAAA-MM-GG)');
            if (typeof departure !== 'string' || !ISO_DATE.test(departure))
                invalid('actualDepartureDate', 'Data non valida (formato AAAA-MM-GG)');
            if (departure < arrival)
                invalid(
                    'actualDepartureDate',
                    'La data di partenza deve essere uguale o successiva a quella di arrivo',
                );
            return { application: db.insertMobilityDates(id, user, arrival, departure) };
        },
    },
    {
        method: 'POST',
        pattern: /^\/applications\/(\d+)\/learning-agreements$/,
        status: 201,
        roles: ['student'],
        handle: (req, user, [id]) => {
            const { file, fields } = multipart(req, ['examMappings']);
            const change =
                typeof fields['changeDescription'] === 'string'
                    ? fields['changeDescription'].trim() || undefined
                    : undefined;
            return db.submitLearningAgreement(
                id,
                user,
                file,
                file.name,
                examMappings(fields['examMappings']),
                change,
            );
        },
    },
    {
        method: 'POST',
        pattern: /^\/applications\/(\d+)\/learning-agreements\/(\d+)\/evaluate$/,
        roles: ['lecturer'],
        handle: (req, user, [id, laId]) => {
            const { decision, reason } = evaluation(req);
            return db.evaluateLearningAgreement(id, laId, user, decision, reason);
        },
    },
    {
        method: 'GET',
        pattern: /^\/applications\/(\d+)\/learning-agreements\/(\d+)\/file$/,
        handle: (_r, user, [id, laId]) => db.getFile(id, laId, 'la', user),
    },
    {
        method: 'POST',
        pattern: /^\/applications\/(\d+)\/transcripts$/,
        status: 201,
        roles: ['student'],
        handle: (req, user, [id]) => {
            const { file, fields } = multipart(req, ['results']);
            return db.uploadTranscript(id, user, file, file.name, examResults(fields['results']));
        },
    },
    {
        method: 'POST',
        pattern: /^\/applications\/(\d+)\/transcripts\/(\d+)\/evaluate$/,
        roles: ['lecturer'],
        handle: (req, user, [id, torId]) => {
            const { decision, reason } = evaluation(req);
            return db.evaluateTranscript(id, torId, user, decision, reason);
        },
    },
    {
        method: 'GET',
        pattern: /^\/applications\/(\d+)\/transcripts\/(\d+)\/file$/,
        handle: (_r, user, [id, torId]) => db.getFile(id, torId, 'tor', user),
    },
];

function fail(req: HttpRequest<unknown>, status: number, error: unknown): Observable<never> {
    return throwError(() => new HttpErrorResponse({ status, error, url: req.url })).pipe(
        delay(LATENCY_MS),
    );
}

export const demoBackendInterceptor: HttpInterceptorFn = (req) => {
    const path = req.url.replace(/^\/api\/v1/, '').split('?')[0];

    // Ogni caricamento della pagina parte da un database nuovo: nessuna sessione da ripristinare.
    if (path === '/auth/me') return fail(req, 401, { error: 'Token non valido o scaduto' });

    const header = req.headers.get('Authorization') ?? '';
    const user = header.startsWith('Bearer ' + TOKEN_PREFIX)
        ? db.findUser(Number(header.slice(('Bearer ' + TOKEN_PREFIX).length)))
        : undefined;
    if (!user) return fail(req, 401, { error: 'Token di autenticazione mancante' });

    for (const route of ROUTES) {
        const match = req.method === route.method ? route.pattern.exec(path) : null;
        if (!match) continue;
        if (route.roles && !route.roles.includes(user.role)) {
            return fail(req, 403, { error: 'Permessi insufficienti per questa operazione' });
        }
        try {
            const result = route.handle(req, user, match.slice(1).map(Number));
            return of(
                new HttpResponse({ status: route.status ?? 200, body: result, url: req.url }),
            ).pipe(delay(LATENCY_MS));
        } catch (err) {
            if (err instanceof DemoError) {
                return fail(req, err.status, {
                    error: err.message,
                    ...(err.details !== undefined ? { details: err.details } : {}),
                });
            }
            console.error('[demo] Errore non gestito:', err);
            return fail(req, 500, { error: 'Errore interno del server' });
        }
    }
    return fail(req, 404, { error: `Risorsa non trovata: ${req.method} ${req.url}` });
};
