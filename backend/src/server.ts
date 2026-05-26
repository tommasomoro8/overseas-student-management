import express, { Request, Response } from 'express';
import { Pool } from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';

// Carica le variabili d'ambiente dal file .env se presente (utile per lo sviluppo locale fuori da Docker)
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configurazione del Pool di connessione a PostgreSQL
// Docker passerà automaticamente queste variabili d'ambiente tramite il docker-compose.yml
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'user',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'mydatabase',
});

async function seedDatabase() {
    try {
        // Test di connessione
        await pool.query('SELECT NOW()');
        console.log("🔌 Connessione al database stabilita con successo!");

        // Creazione della tabella (DDL)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS film_cinema (
                id SERIAL PRIMARY KEY,
                titolo VARCHAR(100) NOT NULL,
                regista VARCHAR(100),
                sala INT,
                in_programmazione BOOLEAN DEFAULT TRUE
            );
        `);
        console.log("✅ Tabella 'film_cinema' verificata/creata.");

        // Controllo quanti record ci sono
        const check = await pool.query('SELECT COUNT(*) FROM film_cinema');
        
        // Se la tabella è vuota, inseriamo i dati fittizi (DML)
        if (parseInt(check.rows[0].count) === 0) {
            await pool.query(`
                INSERT INTO film_cinema (titolo, regista, sala, in_programmazione) VALUES 
                ('Interstellar', 'Christopher Nolan', 1, TRUE),
                ('The Matrix', 'Lana & Lilly Wachowski', 2, FALSE),
                ('Dune - Parte Due', 'Denis Villeneuve', 3, TRUE),
                ('Pulp Fiction', 'Quentin Tarantino', 1, FALSE);
            `);
            console.log("🍿 Dati fittizi inseriti con successo!");
        } else {
            console.log("ℹ️ La tabella contiene già dei dati, salto l'inserimento.");
        }

    } catch (error) {
        console.error("❌ Errore durante l'inizializzazione del database:", error);
    }
}

// Rotta di esempio (Endpoint di test)
app.get('/api/status', async (req: Request, res: Response) => {
  try {
    seedDatabase();
    res.json({
      status: 'OK come va?',
      message: 'Il backend risponde correttamente!'
    });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: 'Errore nel recupero dei dati dal DB' });
  }
});

// Avvio del server
app.listen(port, async () => {
  console.log(`🚀 Server backend in ascolto sulla porta ${port}`);
});