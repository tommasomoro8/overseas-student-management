import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import * as authService from '../services/auth.service';

/** POST /api/v1/auth/register — registra uno studente e restituisce utente + token. */
export const register = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, firstName, lastName, matriculationNumber } = req.body;
    const result = await authService.registerStudent({
        email,
        password,
        firstName,
        lastName,
        matriculationNumber,
    });
    res.status(201).json(result);
});

/** POST /api/v1/auth/login — autentica un utente e restituisce utente + token. */
export const login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.status(200).json(result);
});

/** GET /api/v1/auth/me — restituisce i dati dell'utente autenticato. */
export const me = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        throw new AppError(401, 'Non autenticato');
    }
    const user = await authService.getCurrentUser(req.user.id);
    res.status(200).json({ user });
});

/** POST /api/v1/auth/staff — crea un account staff (docente/ufficio). Solo office. */
export const createStaff = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, firstName, lastName, role } = req.body;
    const user = await authService.createStaff({ email, password, firstName, lastName, role });
    res.status(201).json({ user });
});
