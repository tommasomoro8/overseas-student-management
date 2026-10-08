/* ===========================================================================
   Overseas Mobility — build della demo statica.
   1. compila Angular con la configurazione "demo" (backend simulato in memoria,
      scelta dell'account al posto della login);
   2. incorpora JS, CSS e favicon in un unico file HTML: docs/demo.html.
   Uso (dalla cartella src/frontend):  npm run build:demo
   =========================================================================== */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist/demo/browser');
const out = resolve(root, '../../docs/demo.html');

execSync('npx ng build --configuration demo', { cwd: root, stdio: 'inherit' });

const read = (file) => readFileSync(join(dist, file), 'utf8');
// "</script" dentro il codice chiuderebbe il tag inline
const inlineJs = (file) => read(file).replace(/<\/script/gi, '<\\/script');

let html = read('index.html');

// CSS globale: <link href="styles.css"> (anche nella variante con media="print" + onload)
html = html.replace(/<noscript>.*?<\/noscript>/gs, '');
html = html.replace(
    /<link[^>]*href="styles\.css"[^>]*>/,
    () => `<style>${read('styles.css')}</style>`,
);

// Script ES module: polyfills prima di main, come nella build normale
html = html.replace(
    /<script src="([^"]+\.js)" type="module"><\/script>/g,
    (_m, file) => `<script type="module">${inlineJs(file)}</script>`,
);

// Niente <base href>: il file deve funzionare da qualsiasi percorso
html = html.replace(/<base href="[^"]*"\s*\/?>/, '');

// Favicon come data URI
const icon = readFileSync(join(root, 'public/favicon.ico')).toString('base64');
html = html.replace(/href="favicon\.ico"/, `href="data:image/x-icon;base64,${icon}"`);

html = html.replace('<title>Overseas Mobility</title>', '<title>Overseas Mobility · Demo</title>');

if (/<script src=|href="styles\.css"/.test(html)) {
    throw new Error('Riferimenti a file esterni rimasti in demo.html');
}
writeFileSync(out, html);
console.log(`[demo] Scritto ${out} (${(html.length / 1024).toFixed(0)} kB)`);
