import { z } from 'zod';
import { MOBILITY_PERIODS } from '../types/application.types';

const isoDate = z.string().date('Data non valida (formato AAAA-MM-GG)');

/** POST /api/v1/applications — creazione domanda (solo studente). */
export const createApplicationSchema = z.object({
    referentLecturerId: z.number().int().positive('Referente non valido'),
    hostInstitutionId: z.number().int().positive('Istituzione non valida'),
    academicYear: z // Anno accademico nel formato "AAAA/AAAA" (es. 2025/2026).
        .string()
        .trim()
        .regex(/^\d{4}\/\d{4}$/, 'Anno accademico nel formato AAAA/AAAA (es. 2025/2026)'),
    expectedPeriod: z.enum(MOBILITY_PERIODS, {
        message: 'Periodo previsto non valido: ammessi FIRST_SEMESTER, SECOND_SEMESTER, FULL_YEAR',
    }),
});

/** POST /api/v1/applications/:id/mobility-dates — inserimento date effettive di mobilita'. */
export const mobilityDatesSchema = z
    .object({
        actualArrivalDate: isoDate,
        actualDepartureDate: isoDate,
    })
    .refine((d) => d.actualDepartureDate >= d.actualArrivalDate, {
        message: 'La data di partenza deve essere uguale o successiva a quella di arrivo',
        path: ['actualDepartureDate'],
    });
