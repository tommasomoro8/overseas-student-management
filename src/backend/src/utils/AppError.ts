/**
 * Errore applicativo con codice di stato HTTP associato.
 * I controller/servizi lanciano questo errore; il middleware centrale
 * lo trasforma in una risposta JSON coerente.
 */
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly details?: unknown;

    constructor(statusCode: number, message: string, details?: unknown) {
        super(message);
        
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.details = details;

        // Necessario quando si estende una classe nativa compilando verso ES5/ES6.
        // err instanceof AppError in error.middleware.ts sennò potrebbe non funzionare
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
