import { z } from 'zod';

/**
 * Body di valutazione (condiviso da Learning Agreement e Transcript).
 * reason e' una nota libera sulla decisione: obbligatoria solo in caso di rifiuto,
 * facoltativa in caso di approvazione.
 */
export const evaluateSchema = z
    .object({
        decision: z.enum(['APPROVED', 'REJECTED'], {
            errorMap: () => ({ message: "La decisione deve essere 'APPROVED' o 'REJECTED'" }),
        }),
        reason: z.string().trim().min(1).max(2000).optional(),
    })
    .superRefine((data, ctx) => {
        if (data.decision === 'REJECTED' && !data.reason) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['reason'],
                message: "La motivazione e' obbligatoria in caso di rifiuto",
            });
        }
    });
