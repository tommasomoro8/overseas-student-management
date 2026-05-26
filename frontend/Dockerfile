# --- Stage 1: Build dell'app Angular ---
FROM node:20 AS builder

WORKDIR /app

# Copia i file delle dipendenze
COPY package*.json ./

# Installa le dipendenze di Angular
RUN npm install

# Copia il codice sorgente
COPY . .

# Compila l'app Angular per la produzione
RUN npm run build --configuration=production

# --- Stage 2: Serve con Nginx ---
FROM nginx:alpine

# Rimuovi la pagina di default di nginx
RUN rm -rf /usr/share/nginx/html/*

# Copia la build generata dallo Stage 1 (cambia "nome-tuo-progetto" con il nome effettivo generato nella cartella dist)
COPY --from=builder /app/dist/nome-tuo-progetto/browser /usr/share/nginx/html

# Copia la configurazione personalizzata di Nginx (se ne hai creata una, vedi nota sotto)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]