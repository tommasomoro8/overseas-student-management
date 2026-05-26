# Usa un'immagine Node.js
FROM node:20

# Imposta la directory di lavoro nel container
WORKDIR /app

# Copia i file delle dipendenze
COPY package*.json ./

# Installa le dipendenze
RUN npm install

# Copia il resto del codice sorgente
COPY . .

# Compila il progetto TypeScript (assicurati di avere uno script "build": "tsc" nel package.json)
RUN npm run build

# Esponi la porta
EXPOSE 3000

# Avvia l'applicazione (assicurati che lo script "start" punti a "node dist/index.js" o simile)
CMD ["npm", "start"]