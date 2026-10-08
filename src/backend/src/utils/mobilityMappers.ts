import { EvaluationDecision } from '../types/application.types';
import { ApplicationRow } from '../models/application.model';
import { InstitutionRow } from '../models/institution.model';
import { ExamMappingRow } from '../models/examMapping.model';
import { LearningAgreementRow } from '../models/learningAgreement.model';
import { UserRow } from '../models/user.model';
import { countryFlag } from './countryFlag';
import {
    PublicApplication,
    PublicDocument,
    PublicEvaluation,
    PublicExamMapping,
    PublicInstitution,
    PublicLearningAgreement,
    PublicUserSummary,
} from '../types/mobility.types';

/** Riepilogo pubblico di un utente (senza email/hash): nome, matricola e ruolo. */
export function toPublicUserSummary(row: UserRow): PublicUserSummary {
    return {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        matriculationNumber: row.matriculation_number,
        role: row.role,
    };
}

/** Forma strutturale comune alle righe valutazione di Learning Agreement e Transcript. */
interface EvaluationRowLike {
    id: number;
    lecturer_id: number;
    decision: EvaluationDecision;
    reason: string | null;
    evaluated_at: Date;
}

/** Forma strutturale comune alle righe documento (Learning Agreement e Transcript). */
interface DocumentRowLike {
    id: number;
    application_id: number;
    file_url: string;
    original_name: string;
    version_number: number;
    is_active: boolean;
    uploaded_at: Date;
}

export function toPublicInstitution(row: InstitutionRow): PublicInstitution {
    return {
        id: row.id,
        name: row.name,
        country: row.country,
        city: row.city,
        erasmusCode: row.erasmus_code,
        flag: row.flag ?? countryFlag(row.country),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export function toPublicApplication(row: ApplicationRow): PublicApplication {
    return {
        id: row.id,
        studentId: row.student_id,
        referentLecturerId: row.referent_lecturer_id,
        hostInstitutionId: row.host_institution_id,
        academicYear: row.academic_year,
        expectedPeriod: row.expected_period,
        status: row.status,
        actualArrivalDate: row.actual_arrival_date,
        actualDepartureDate: row.actual_departure_date,
        mobilityDatesInsertedAt: row.mobility_dates_inserted_at,
        preDepartureApprovedAt: row.pre_departure_approved_at,
        closedAt: row.closed_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export function toPublicEvaluation(row: EvaluationRowLike): PublicEvaluation {
    return {
        id: row.id,
        lecturerId: row.lecturer_id,
        decision: row.decision,
        reason: row.reason,
        evaluatedAt: row.evaluated_at,
    };
}

export function toPublicDocument(
    row: DocumentRowLike,
    evaluation: EvaluationRowLike | null,
): PublicDocument {
    return {
        id: row.id,
        applicationId: row.application_id,
        fileUrl: row.file_url,
        originalName: row.original_name,
        versionNumber: row.version_number,
        isActive: row.is_active,
        uploadedAt: row.uploaded_at,
        evaluation: evaluation ? toPublicEvaluation(evaluation) : null,
    };
}

export function toPublicExamMapping(row: ExamMappingRow): PublicExamMapping {
    return {
        id: row.id,
        learningAgreementId: row.learning_agreement_id,
        foreignCode: row.foreign_code,
        foreignTitle: row.foreign_title,
        foreignCredits: Number(row.foreign_credits),
        homeCode: row.home_code,
        homeTitle: row.home_title,
        homeCredits: Number(row.home_credits),
        score: row.score,
        examDate: row.exam_date,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

/** Versione di Learning Agreement: documento + snapshot del mapping + descrizione. */
export function toPublicLearningAgreement(
    row: LearningAgreementRow,
    evaluation: EvaluationRowLike | null,
    mappings: ExamMappingRow[],
): PublicLearningAgreement {
    return {
        ...toPublicDocument(row, evaluation),
        changeDescription: row.change_description,
        examMappings: mappings.map(toPublicExamMapping),
    };
}
