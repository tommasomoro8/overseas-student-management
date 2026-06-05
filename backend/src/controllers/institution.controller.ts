import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { parseIdParam } from '../utils/requestHelpers';
import * as institutionService from '../services/institution.service';

/** GET /api/v1/institutions — elenco istituzioni. */
export const list = asyncHandler(async (_req: Request, res: Response) => {
    const institutions = await institutionService.listInstitutions();
    res.status(200).json({ institutions });
});

/** GET /api/v1/institutions/:id — singola istituzione. */
export const getOne = asyncHandler(async (req: Request, res: Response) => {
    const id = parseIdParam(req.params.id, 'Id istituzione');
    const institution = await institutionService.getInstitution(id);
    res.status(200).json({ institution });
});

/** POST /api/v1/institutions — crea istituzione (solo office). */
export const create = asyncHandler(async (req: Request, res: Response) => {
    const institution = await institutionService.createInstitution(req.body);
    res.status(201).json({ institution });
});

/** PUT /api/v1/institutions/:id — aggiorna istituzione (solo office). */
export const update = asyncHandler(async (req: Request, res: Response) => {
    const id = parseIdParam(req.params.id, 'Id istituzione');
    const institution = await institutionService.updateInstitution(id, req.body);
    res.status(200).json({ institution });
});

/** DELETE /api/v1/institutions/:id — elimina istituzione (solo office). */
export const remove = asyncHandler(async (req: Request, res: Response) => {
    const id = parseIdParam(req.params.id, 'Id istituzione');
    await institutionService.deleteInstitution(id);
    res.status(204).send();
});
