import { Pool, PoolClient, QueryResult, QueryResultRow, types } from 'pg';
import { env } from './env';

// Le colonne DATE (OID 1082) vengono restituite come stringa 'YYYY-MM-DD' invece che
// come oggetto Date: evita lo shift di un giorno dovuto al fuso orario in serializzazione.
types.setTypeParser(1082, (value: string) => value);

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
export async function query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
): Promise<QueryResult<T>> {
    return pool.query<T>(text, params as unknown[] | undefined);
}

/**
 * Esegue "fn" dentro una transazione (BEGIN/COMMIT, ROLLBACK in caso di errore).
 * Le funzioni dei model che devono partecipare alla stessa transazione ricevono
 * il "client" e devono usarlo al posto dell'helper query() globale.
 */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw err;
    } finally {
        client.release();
    }
}
