/**
 * Codici di errore PostgreSQL usati per mappare le violazioni dei vincoli
 * in risposte HTTP coerenti (vedi https://www.postgresql.org/docs/current/errcodes-appendix.html).
 */
export const UNIQUE_VIOLATION = '23505';
export const FOREIGN_KEY_VIOLATION = '23503';

/** True se "err" e' un errore di PostgreSQL con lo specifico codice SQLSTATE. */
export function isPgError(err: unknown, code: string): boolean {
    return (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code?: string }).code === code
    );
}
