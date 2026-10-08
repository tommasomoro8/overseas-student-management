import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { listUsersByRole } from '../models/user.model';
import { toPublicUserSummary } from '../utils/mobilityMappers';

/**
 * GET /api/v1/users/lecturers — elenco dei docenti selezionabili come referente.
 * Accessibile a qualsiasi utente autenticato (serve allo studente in fase di creazione
 * domanda e al client per risolvere i nomi). Restituisce solo dati pubblici.
 */
export const listLecturers = asyncHandler(async (_req: Request, res: Response) => {
    const rows = await listUsersByRole('lecturer');
    const lecturers = rows.map(toPublicUserSummary);
    res.status(200).json({ lecturers });
});
