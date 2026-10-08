import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { parseIdParam, requireUser } from '../utils/requestHelpers';
import { sendPdfDownload } from '../middlewares/upload.middleware';
import * as transcriptService from '../services/transcript.service';

/** GET /applications/:applicationId/transcripts — storico versioni + valutazioni. */
export const list = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const applicationId = parseIdParam(req.params.applicationId, 'Id domanda');
    const transcripts = await transcriptService.listTranscriptsForApplication(applicationId, user);
    res.status(200).json({ transcripts });
});

/** POST /applications/:applicationId/transcripts — upload nuova versione (studente). */
export const upload = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const applicationId = parseIdParam(req.params.applicationId, 'Id domanda');
    if (!req.file) {
        throw new AppError(400, 'File mancante (campo form "file")');
    }
    const result = await transcriptService.uploadTranscript(
        applicationId,
        user,
        req.file.filename,
        req.file.originalname,
        req.body.results,
    );
    res.status(201).json(result);
});

/** GET /applications/:applicationId/transcripts/:torId/file — download autenticato. */
export const download = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const applicationId = parseIdParam(req.params.applicationId, 'Id domanda');
    const torId = parseIdParam(req.params.torId, 'Id Transcript');
    const doc = await transcriptService.getTranscriptForDownload(applicationId, torId, user);
    sendPdfDownload(res, doc.storedName, doc.originalName);
});

/** POST /applications/:applicationId/transcripts/:torId/evaluate — valutazione (docente/office). */
export const evaluate = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const applicationId = parseIdParam(req.params.applicationId, 'Id domanda');
    const torId = parseIdParam(req.params.torId, 'Id Transcript');
    const { decision, reason } = req.body;
    const result = await transcriptService.evaluateTranscript(
        applicationId,
        torId,
        user,
        decision,
        reason ?? null,
    );
    res.status(200).json(result);
});
