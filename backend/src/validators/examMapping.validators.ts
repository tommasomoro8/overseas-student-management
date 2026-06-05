import { z } from 'zod';

const text = (label: string, max: number) =>
    z.string().trim().min(1, `${label} obbligatorio`).max(max, `${label} troppo lungo`);

const credits = z
    .number()
    .nonnegative('I crediti non possono essere negativi')
    .max(999, 'Numero di crediti non valido');

/**
 * Una riga del mapping esami (equivalenza estero <-> Ca' Foscari).
 * Voto e data NON sono qui: viaggiano col Transcript of Records (vedi uploadTranscriptSchema).
 */
export const examMappingRowSchema = z.object({
    foreignCode: text('Codice esame estero', 50),
    foreignTitle: text('Titolo esame estero', 255),
    foreignCredits: credits,
    homeCode: text('Codice esame interno', 50),
    homeTitle: text('Titolo esame interno', 255),
    homeCredits: credits,
});

/** Lista di mapping non vuota (inviata insieme al Learning Agreement). */
export const examMappingListSchema = z
    .array(examMappingRowSchema)
    .min(1, 'Inserire almeno una corrispondenza esame');

/**
 * POST /applications/:id/learning-agreements (multipart) — submit del LA con il mapping.
 * examMappings e changeDescription sono opzionali nello schema: i controlli "mapping
 * obbligatorio al primo invio" e "descrizione obbligatoria per le modifiche" sono a
 * livello di servizio (dipendono dallo stato della domanda).
 */
export const submitLearningAgreementSchema = z.object({
    examMappings: examMappingListSchema.optional(),
    changeDescription: z.string().trim().min(1).max(2000).optional(),
});

/**
 * POST /applications/:id/transcripts (multipart) — i voti viaggiano insieme al PDF del ToR.
 * "results" e' obbligatorio e deve coprire tutti gli esami del mapping attivo (controllo a
 * livello di servizio): cosi' un Transcript inviato porta gia' con se' i risultati completi.
 */
export const uploadTranscriptSchema = z.object({
    results: z
        .array(
            z.object({
                examMappingId: z.number().int().positive('Id mapping esame non valido'),
                score: z.string().trim().min(1, 'Voto obbligatorio').max(20, 'Voto troppo lungo'),
                examDate: z.string().date('Data esame non valida (formato AAAA-MM-GG)'),
            }),
        )
        .min(1, 'Inserire i voti degli esami'),
});
