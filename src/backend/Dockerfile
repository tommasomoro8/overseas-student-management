# Usa un'immagine Node.js
FROM node:20 AS base

# Imposta la directory di lavoro nel container
WORKDIR /app

# Copia i file delle dipendenze
COPY package*.json ./

# Installa le dipendenze
RUN npm install

# Copia il resto del codice sorgente
COPY . .


# --- STAGE 2: Target per lo Sviluppo (Dev) ---
FROM base AS development
EXPOSE 3000
# Avvia con nodemon configurato nel package.json
CMD ["npm", "run", "dev"]


# --- STAGE 3: Target per la Produzione (Prod) ---
FROM base AS production
# Compila il codice TypeScript usando 'tsc'
RUN npm run build
EXPOSE 3000
# Avvia l'applicazione JavaScript compilata da dist/index.js
CMD ["npm", "start"]