import { ApplicationStatus, EvaluationDecision, MobilityPeriod } from './application.types';
import { UserRole } from './auth.types';

/** Riepilogo pubblico di un partecipante (studente o docente referente) allegato alle domande. */
export interface PublicUserSummary {
    id: number;
    firstName: string;
    lastName: string;
    matriculationNumber: string | null;
    role: UserRole;
}

/**
 * Rappresentazioni "pubbliche" (camelCase) restituite dalle API del modulo mobilita'.
 * I model restituiscono righe snake_case; i service le convertono in questi DTO
 * tramite le funzioni in utils/mobilityMappers.ts.
 */

export interface PublicInstitution {
    id: number;
    name: string;
    country: string;
    city: string;
    erasmusCode: string;
    flag: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface PublicApplication {
    id: number;
    studentId: number;
    referentLecturerId: number;
    hostInstitutionId: number;
    academicYear: string;
    expectedPeriod: MobilityPeriod;
    status: ApplicationStatus;
    actualArrivalDate: string | null;
    actualDepartureDate: string | null;
    mobilityDatesInsertedAt: Date | null;
    preDepartureApprovedAt: Date | null;
    closedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface PublicEvaluation {
    id: number;
    lecturerId: number;
    decision: EvaluationDecision;
    reason: string | null;
    evaluatedAt: Date;
}

/** Forma comune a Learning Agreement e Transcript of Records (documenti versionati). */
export interface PublicDocument {
    id: number;
    applicationId: number;
    fileUrl: string;
    originalName: string;
    versionNumber: number;
    isActive: boolean;
    uploadedAt: Date;
    evaluation: PublicEvaluation | null;
}

/**
 * Una versione del Learning Agreement: documento + lo snapshot del mapping esami
 * che ne costituisce il contenuto, piu' la descrizione (solo per le modifiche).
 */
export interface PublicLearningAgreement extends PublicDocument {
    changeDescription: string | null;
    examMappings: PublicExamMapping[];
}

export interface PublicExamMapping {
    id: number;
    learningAgreementId: number;
    foreignCode: string;
    foreignTitle: string;
    foreignCredits: number;
    homeCode: string;
    homeTitle: string;
    homeCredits: number;
    score: string | null;
    examDate: string | null;
    createdAt: Date;
    updatedAt: Date;
}

/** Vista di dettaglio: domanda + istituzione + partecipanti + documenti + valutazioni + esami. */
export interface ApplicationDetail extends PublicApplication {
    institution: PublicInstitution | null;
    student: PublicUserSummary | null;
    lecturer: PublicUserSummary | null;
    learningAgreements: PublicLearningAgreement[];
    transcripts: PublicDocument[];
    /** Mapping della versione di Learning Agreement attualmente attiva (comodita' per il client). */
    activeExamMappings: PublicExamMapping[];
}
