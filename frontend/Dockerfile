# --- STAGE 1: Base comune ---
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# --- STAGE 2: Target per lo Sviluppo (Dev) ---
FROM base AS development
EXPOSE 4200
# Avvia il server di sviluppo di Angular accessibile dall'esterno del container.
# --poll: il file-watch nativo non è affidabile sui bind mount di Docker su macOS,
#         quindi si usa il polling. Il proxy /api -> backend è in proxy.conf.js
#         (collegato in angular.json), così le chiamate al backend funzionano da subito.
CMD ["npx", "ng", "serve", "--host", "0.0.0.0", "--poll", "2000"]

# --- STAGE 3: Target per la Produzione (Prod) ---
FROM base AS production
RUN npm run build --configuration=production

FROM nginx:alpine
# Copia i file statici compilati nell'immagine Nginx
# NOTA: Verifica se la cartella di build di Angular 17+ è dist/frontend/browser
COPY --from=production /app/dist/frontend/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]