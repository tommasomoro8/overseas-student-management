import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { parseIdParam, requireUser } from '../utils/requestHelpers';
import { sendPdfDownload } from '../middlewares/upload.middleware';
import * as laService from '../services/learningAgreement.service';

/** GET /applications/:applicationId/learning-agreements — storico versioni + mapping + valutazioni. */
export const list = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const applicationId = parseIdParam(req.params.applicationId, 'Id domanda');
    const learningAgreements = await laService.listLearningAgreementsForApplication(
        applicationId,
        user,
    );
    res.status(200).json({ learningAgreements });
});

/**
 * POST /applications/:applicationId/learning-agreements — invio del Learning Agreement
 * (file + eventuale mapping + descrizione modifica). Solo studente proprietario.
 */
export const submit = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const applicationId = parseIdParam(req.params.applicationId, 'Id domanda');
    if (!req.file) {
        throw new AppError(400, 'File mancante (campo form "file")');
    }
    const { examMappings, changeDescription } = req.body;
    const result = await laService.submitLearningAgreement(
        applicationId,
        user,
        req.file.filename,
        req.file.originalname,
        examMappings,
        changeDescription,
    );
    res.status(201).json(result);
});

/** GET /applications/:applicationId/learning-agreements/:laId/file — download autenticato. */
export const download = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const applicationId = parseIdParam(req.params.applicationId, 'Id domanda');
    const laId = parseIdParam(req.params.laId, 'Id Learning Agreement');
    const doc = await laService.getLearningAgreementForDownload(applicationId, laId, user);
    sendPdfDownload(res, doc.storedName, doc.originalName);
});

/** POST /applications/:applicationId/learning-agreements/:laId/evaluate — valutazione (docente/office). */
export const evaluate = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const applicationId = parseIdParam(req.params.applicationId, 'Id domanda');
    const laId = parseIdParam(req.params.laId, 'Id Learning Agreement');
    const { decision, reason } = req.body;
    const result = await laService.evaluateLearningAgreement(
        applicationId,
        laId,
        user,
        decision,
        reason ?? null,
    );
    res.status(200).json(result);
});
