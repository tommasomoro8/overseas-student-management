/* ===========================================================================
   Overseas Mobility — view-model di dominio (popolato dai Data Transfer Object backend via mappers)
   =========================================================================== */
import { ApplicationStatus } from './api.types';

export type Role = 'student' | 'lecturer' | 'office';

// fase UI derivata dallo stato backend
export type Phase = 'pre-departure' | 'during-mobility' | 'after-returning' | 'concluded';

// la ViewModel usa direttamente lo stato del backend
export type Status = ApplicationStatus;

export type DocStatus = 'pending' | 'approved' | 'rejected';
// done = fatto (verde) · action = tocca a me (arancione) · waiting = tocca ad altri (blu)
// future = non ancora raggiunto (grigio) · rejected = step rifiutato (rosso)
export type StepState = 'done' | 'action' | 'waiting' | 'future' | 'rejected';

export interface Institution {
    id: number;
    name: string;
    city: string;
    country: string;
    flag: string;
    erasmusCode?: string;
}

export interface Lecturer {
    id: number;
    name: string;
    title: string;
}

export interface Student {
    id: number;
    name: string;
    matricola: string | null;
}

export interface Period {
    id: string;
    label: string;
}

export interface Exam {
    mappingId: number | null;
    foreignCode: string;
    foreignName: string;
    foreignCredits: number;
    cfCode: string;
    cfTitle: string;
    cfCredits: number;
    score: string | null;
    examDate: string | null;
}

export interface LearningAgreement {
    id: number;
    version: number;
    fileName: string;
    at: string;
    status: DocStatus;
    reason: string | null;
    isActive: boolean;
    changeDescription: string | null;
}

export interface Transcript {
    id: number;
    version: number;
    fileName: string;
    at: string;
    status: DocStatus;
    reason: string | null;
    isActive: boolean;
}

export interface Modification {
    id: string;
    description: string;
    at: string;
    status: DocStatus;
    reason: string | null;
    laVersion: number;
}

export interface TimelineStep {
    id: string;
    label: string;
    state: StepState;
    actorRole: Role; // chi compie/ha compiuto l'azione di questo step
    at: string | null;
    by: string | null;
    note?: string;
}

export interface Application {
    id: string; // id "umano" per la UI (es. APP-12)
    numericId: number; // id reale usato dalle API
    student: Student;
    lecturer: Lecturer;
    academicYear: string;
    institution: Institution;
    period: Period;
    phase: Phase;
    status: Status;
    arrival: string | null;
    departure: string | null;
    exams: Exam[];
    learningAgreements: LearningAgreement[];
    transcripts: Transcript[];
    modifications: Modification[];
    timeline: TimelineStep[];
    activeLaId: number | null;
    activeTorId: number | null;
}

export interface ActionStatus {
    kind: 'none' | 'todo' | 'waiting';
    label: string;
}

export interface Route {
    view: 'list' | 'detail' | 'create';
    appId: string | null;
}

export interface ScoreInput {
    score: number;
    date: string;
}
