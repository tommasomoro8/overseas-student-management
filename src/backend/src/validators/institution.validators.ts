import { z } from 'zod';

const text = (label: string, max: number) =>
    z.string().trim().min(1, `${label} obbligatorio`).max(max, `${label} troppo lungo`);

/** POST/PUT /api/v1/institutions — creazione/aggiornamento istituzione (solo office). */
export const institutionSchema = z.object({
    name: text('Nome', 255),
    country: text('Paese', 100),
    city: text("Citta'", 100),
    erasmusCode: text('Codice Erasmus', 50),
    // Bandiera opzionale: se omessa (o vuota) viene derivata dal paese lato model.
    flag: z.string().trim().max(10, 'Bandiera troppo lunga').optional(),
});
