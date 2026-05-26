import express from 'express';
const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  res.json({ message: "Backend attivo e funzionante con TS!" });
});

// Il secondo parametro (la funzione freccia) stampa il log all'avvio
app.listen(PORT, () => {
  console.log(`🚀 Server in esecuzione su http://localhost:${PORT}`);
});