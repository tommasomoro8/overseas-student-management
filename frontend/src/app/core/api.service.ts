/* ===========================================================================
   Overseas Mobility — client HTTP verso il backend (/api/v1).
   Ritorna i DTO grezzi; il mapping a view-model avviene nello store.
   =========================================================================== */
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
    ApplicationDetail,
    ApplicationListItem,
    CreateApplicationBody,
    EvaluationDecision,
    ExamMappingInput,
    ExamResultInput,
    PublicApplication,
    PublicInstitution,
    PublicUserSummary,
} from './api.types';

const BASE = '/api/v1';

@Injectable({
    providedIn: 'root'
})
export class ApiService {
    private readonly http = inject(HttpClient);

    // ---- applications ----
    listApplications(): Observable<ApplicationListItem[]> {
        return this.http
            .get<{ applications: ApplicationListItem[] }>(`${BASE}/applications`)
            .pipe(map((r) => r.applications));
    }

    getApplication(id: number): Observable<ApplicationDetail> {
        return this.http
            .get<{ application: ApplicationDetail }>(`${BASE}/applications/${id}`)
            .pipe(map((r) => r.application));
    }

    createApplication(body: CreateApplicationBody): Observable<PublicApplication> {
        return this.http
            .post<{ application: PublicApplication }>(`${BASE}/applications`, body)
            .pipe(map((r) => r.application));
    }

    preDepartureApproval(id: number): Observable<PublicApplication> {
        return this.http
            .post<{
                application: PublicApplication;
            }>(`${BASE}/applications/${id}/pre-departure-approval`, {})
            .pipe(map((r) => r.application));
    }

    setMobilityDates(
        id: number,
        arrival: string,
        departure: string,
    ): Observable<PublicApplication> {
        return this.http
            .post<{ application: PublicApplication }>(`${BASE}/applications/${id}/mobility-dates`, {
                actualArrivalDate: arrival,
                actualDepartureDate: departure,
            })
            .pipe(map((r) => r.application));
    }

    closeApplication(id: number): Observable<PublicApplication> {
        return this.http
            .post<{ application: PublicApplication }>(`${BASE}/applications/${id}/close`, {})
            .pipe(map((r) => r.application));
    }

    // ---- learning agreements ----
    submitLearningAgreement(
        appId: number,
        file: File,
        examMappings?: ExamMappingInput[],
        changeDescription?: string,
    ): Observable<PublicApplication> {
        const fd = new FormData();
        fd.append('file', file);
        if (examMappings && examMappings.length)
            fd.append('examMappings', JSON.stringify(examMappings));
        if (changeDescription) fd.append('changeDescription', changeDescription);
        return this.http
            .post<{
                application: PublicApplication;
            }>(`${BASE}/applications/${appId}/learning-agreements`, fd)
            .pipe(map((r) => r.application));
    }

    evaluateLearningAgreement(
        appId: number,
        laId: number,
        decision: EvaluationDecision,
        reason?: string,
    ): Observable<PublicApplication> {
        return this.http
            .post<{ application: PublicApplication }>(
                `${BASE}/applications/${appId}/learning-agreements/${laId}/evaluate`,
                {
                    decision,
                    ...(reason ? { reason } : {}),
                },
            )
            .pipe(map((r) => r.application));
    }

    // ---- transcripts ----
    uploadTranscript(
        appId: number,
        file: File,
        results: ExamResultInput[],
    ): Observable<PublicApplication> {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('results', JSON.stringify(results));
        return this.http
            .post<{
                application: PublicApplication;
            }>(`${BASE}/applications/${appId}/transcripts`, fd)
            .pipe(map((r) => r.application));
    }

    evaluateTranscript(
        appId: number,
        torId: number,
        decision: EvaluationDecision,
        reason?: string,
    ): Observable<PublicApplication> {
        return this.http
            .post<{ application: PublicApplication }>(
                `${BASE}/applications/${appId}/transcripts/${torId}/evaluate`,
                {
                    decision,
                    ...(reason ? { reason } : {}),
                },
            )
            .pipe(map((r) => r.application));
    }

    // ---- reference data ----
    listInstitutions(): Observable<PublicInstitution[]> {
        return this.http
            .get<{ institutions: PublicInstitution[] }>(`${BASE}/institutions`)
            .pipe(map((r) => r.institutions));
    }

    listLecturers(): Observable<PublicUserSummary[]> {
        return this.http
            .get<{ lecturers: PublicUserSummary[] }>(`${BASE}/users/lecturers`)
            .pipe(map((r) => r.lecturers));
    }

    // ---- downloads (PDF autenticato) ----
    downloadLearningAgreement(appId: number, laId: number): Observable<Blob> {
        return this.http.get(`${BASE}/applications/${appId}/learning-agreements/${laId}/file`, {
            responseType: 'blob',
        });
    }

    downloadTranscript(appId: number, torId: number): Observable<Blob> {
        return this.http.get(`${BASE}/applications/${appId}/transcripts/${torId}/file`, {
            responseType: 'blob',
        });
    }
}
