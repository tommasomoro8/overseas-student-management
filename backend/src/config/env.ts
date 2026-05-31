import dotenv from 'dotenv';

// Carica le variabili da un eventuale file .env (in Docker arrivano gia' dall'environment).
// quiet: true silenzia il log "injected env ... // tip: ..." stampato da dotenv ad ogni avvio.
dotenv.config({ quiet: true });

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Legge una variabile d'ambiente, usando un fallback se assente.
 * Lancia un errore se la variabile manca e non e' previsto alcun fallback.
 */
function getEnv(name: string, fallback?: string): string {
    const value = process.env[name] ?? fallback;
    if (value === undefined) {
        throw new Error(`Variabile d'ambiente mancante: ${name}`);
    }
    return value;
}

// Il segreto JWT e' obbligatorio in produzione; in sviluppo usiamo un valore di comodo.
let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
    if (isProduction) {
        throw new Error("JWT_SECRET e' obbligatoria quando NODE_ENV=production");
    }
    jwtSecret = 'dev-secret-non-sicuro-cambiami';
    console.warn('[env] JWT_SECRET non impostata: uso un segreto di sviluppo NON sicuro.');
}

/**
 * Configurazione centralizzata e tipizzata dell'applicazione.
 * Ogni altro modulo importa da qui invece di leggere direttamente process.env.
 */
export const env = {
    NODE_ENV: process.env.NODE_ENV ?? 'development',
    PORT: Number(getEnv('PORT', '3000')),

    // Database PostgreSQL
    DB_HOST: getEnv('DB_HOST', 'localhost'),
    DB_PORT: Number(getEnv('DB_PORT', '5432')),
    DB_USER: getEnv('DB_USER', 'user'),
    DB_PASSWORD: getEnv('DB_PASSWORD', 'password'),
    DB_NAME: getEnv('DB_NAME', 'mydatabase'),

    // Autenticazione
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '7d',
    BCRYPT_ROUNDS: Number(process.env.BCRYPT_ROUNDS ?? '10'),

    // Se true, all'avvio precarica gli utenti di test (richiesto dalla specifica)
    SEED: (process.env.SEED ?? 'true') !== 'false',
} as const;
