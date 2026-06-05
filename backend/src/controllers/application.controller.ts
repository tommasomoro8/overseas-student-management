import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { parseIdParam, requireUser } from '../utils/requestHelpers';
import { APPLICATION_STATUSES, ApplicationStatus } from '../types/application.types';
import * as applicationService from '../services/application.service';

function parseStatusQuery(value: unknown): ApplicationStatus | null {
    if (value === undefined) {
        return null;
    }
    if (typeof value === 'string' && (APPLICATION_STATUSES as readonly string[]).includes(value)) {
        return value as ApplicationStatus;
    }
    throw new AppError(400, 'Parametro status non valido');
}

/** GET /api/v1/applications — elenco filtrato per ruolo (?status= opzionale). */
export const list = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const status = parseStatusQuery(req.query.status);
    const applications = await applicationService.listApplications(user, status);
    res.status(200).json({ applications });
});

/** GET /api/v1/applications/:applicationId — dettaglio completo della domanda. */
export const detail = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const applicationId = parseIdParam(req.params.applicationId, 'Id domanda');
    const application = await applicationService.getApplicationDetail(applicationId, user);
    res.status(200).json({ application });
});

/** POST /api/v1/applications — crea una domanda (solo studente). */
export const create = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const { referentLecturerId, hostInstitutionId, academicYear, expectedPeriod } = req.body;
    const application = await applicationService.createApplication({
        studentId: user.id,
        referentLecturerId,
        hostInstitutionId,
        academicYear,
        expectedPeriod,
    });
    res.status(201).json({ application });
});

/** POST /api/v1/applications/:applicationId/pre-departure-approval — ok pre-partenza (office). */
export const preDepartureApproval = asyncHandler(async (req: Request, res: Response) => {
    const applicationId = parseIdParam(req.params.applicationId, 'Id domanda');
    const application = await applicationService.approvePreDeparture(applicationId);
    res.status(200).json({ application });
});

/** POST /api/v1/applications/:applicationId/mobility-dates — inserimento date (studente). */
export const mobilityDates = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const applicationId = parseIdParam(req.params.applicationId, 'Id domanda');
    const { actualArrivalDate, actualDepartureDate } = req.body;
    const application = await applicationService.insertMobilityDates(
        applicationId,
        user,
        actualArrivalDate,
        actualDepartureDate,
    );
    res.status(200).json({ application });
});

/** POST /api/v1/applications/:applicationId/close — chiusura definitiva (office). */
export const close = asyncHandler(async (req: Request, res: Response) => {
    const applicationId = parseIdParam(req.params.applicationId, 'Id domanda');
    const application = await applicationService.closeApplication(applicationId);
    res.status(200).json({ application });
});
