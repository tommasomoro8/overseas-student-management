import { Pool, QueryResult, QueryResultRow } from 'pg';
import { env } from './env';

/**
 * Pool di connessioni a PostgreSQL condiviso da tutta l'applicazione.
 * Il pool gestisce automaticamente apertura/riuso/chiusura delle connessioni.
 */
export const pool = new Pool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
});

/**
 * Helper tipizzato per eseguire query parametrizzate.
 * Usare SEMPRE i placeholder ($1, $2, ...) per evitare SQL injection.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<T>> {
    return pool.query<T>(text, params as unknown[] | undefined);
}
