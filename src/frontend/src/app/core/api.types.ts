/* ===========================================================================
   Overseas Mobility — DTO grezzi del backend (/api/v1) e relativi enum.
   Rispecchiano esattamente le risposte di Express (camelCase).
   =========================================================================== */

export type ApplicationStatus =
    | 'DRAFT'
    | 'LA_SUBMITTED'
    | 'LA_APPROVED'
    | 'LA_REJECTED'
    | 'PRE_DEPARTURE_APPROVED'
    | 'MOBILITY_IN_PROGRESS'
    | 'LA_CHANGE_SUBMITTED'
    | 'TOR_SUBMITTED'
    | 'TOR_APPROVED'
    | 'TOR_REJECTED'
    | 'CLOSED';

export type MobilityPeriod = 'FIRST_SEMESTER' | 'SECOND_SEMESTER' | 'FULL_YEAR';
export type EvaluationDecision = 'APPROVED' | 'REJECTED';
export type ApiRole = 'student' | 'lecturer' | 'office';

export interface PublicInstitution {
    id: number;
    name: string;
    country: string;
    city: string;
    erasmusCode: string;
    flag: string;
    createdAt: string;
    updatedAt: string;
}

export interface PublicUserSummary {
    id: number;
    firstName: string;
    lastName: string;
    matriculationNumber: string | null;
    role: ApiRole;
}

export interface PublicEvaluation {
    id: number;
    lecturerId: number;
    decision: EvaluationDecision;
    reason: string | null;
    evaluatedAt: string;
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
    createdAt: string;
    updatedAt: string;
}

export interface PublicDocument {
    id: number;
    applicationId: number;
    fileUrl: string;
    originalName: string;
    versionNumber: number;
    isActive: boolean;
    uploadedAt: string;
    evaluation: PublicEvaluation | null;
}

export interface PublicLearningAgreement extends PublicDocument {
    changeDescription: string | null;
    examMappings: PublicExamMapping[];
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
    mobilityDatesInsertedAt: string | null;
    preDepartureApprovedAt: string | null;
    closedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface ApplicationListItem extends PublicApplication {
    institution: PublicInstitution | null;
    student: PublicUserSummary | null;
    lecturer: PublicUserSummary | null;
}

export interface ApplicationDetail extends PublicApplication {
    institution: PublicInstitution | null;
    student: PublicUserSummary | null;
    lecturer: PublicUserSummary | null;
    learningAgreements: PublicLearningAgreement[];
    transcripts: PublicDocument[];
    activeExamMappings: PublicExamMapping[];
}

/* ----- payload di input ----- */
export interface CreateApplicationBody {
    referentLecturerId: number;
    hostInstitutionId: number;
    academicYear: string;
    expectedPeriod: MobilityPeriod;
}

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

/* ----- opzioni periodo (per il form di creazione) ----- */
export const PERIOD_OPTIONS: { id: MobilityPeriod; label: string }[] = [
    { id: 'FIRST_SEMESTER', label: 'Primo semestre' },
    { id: 'SECOND_SEMESTER', label: 'Secondo semestre' },
    { id: 'FULL_YEAR', label: 'Intero anno accademico' },
];

export const PERIOD_LABEL: Record<MobilityPeriod, string> = {
    FIRST_SEMESTER: 'Primo semestre',
    SECOND_SEMESTER: 'Secondo semestre',
    FULL_YEAR: 'Intero anno accademico',
};
