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

# --- STAGE 3: Build di produzione (compila Angular) ---
FROM base AS build
# defaultConfiguration in angular.json è "production": ng build è già ottimizzato.
RUN npm run build

# --- STAGE 4: Immagine di produzione servita da Nginx (questo è il target "production") ---
FROM nginx:alpine AS production
# Reverse proxy + serving statico (dettagli nei commenti di nginx.conf)
COPY nginx.conf /etc/nginx/conf.d/default.conf
# File statici compilati da Angular (application builder -> dist/frontend/browser)
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]