/* ===========================================================================
   Dev-server proxy: inoltra le chiamate /api al backend Express.
   - In Docker:   BACKEND_URL=http://backend:3000 (nome del servizio compose)
   - In locale:   default http://localhost:3000 (backend mappato sull'host)
   Così l'app Angular chiama sempre percorsi relativi "/api/..." senza CORS
   e senza URL hard-coded. Usato da `ng serve` via angular.json (proxyConfig).
   =========================================================================== */
const target = process.env.BACKEND_URL || 'http://localhost:3000';

module.exports = [
  {
    context: ['/api'],
    target,
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
  },
  {
    // WebSocket di socket.io per l'auto-refresh delle pratiche.
    context: ['/socket.io'],
    target,
    secure: false,
    changeOrigin: true,
    ws: true,
    logLevel: 'debug',
  },
];
