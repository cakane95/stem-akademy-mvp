// server.mjs
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app  = express();
const port = process.env.PORT || 5173;
const host = process.env.HOST || '0.0.0.0';

// 🔐 COOP/COEP pour activer SharedArrayBuffer (Pyodide + Worker)
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  // Optionnel mais souvent utile quand on consomme des ressources cross-origin compatibles
  // res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

// ⚙️ Static + no-cache (dev): servez toute la racine du projet
app.use(express.static(__dirname, {
  etag: false,
  lastModified: false,
  cacheControl: false,
  setHeaders: (res, filePath) => {
    // Aide certains navigateurs pour .wasm
    if (filePath.endsWith('.wasm')) {
      res.setHeader('Content-Type', 'application/wasm');
    }
    // Pas de cache en dev
    res.setHeader('Cache-Control', 'no-store');
  }
}));

// (Facultatif) Healthcheck simple
app.get('/healthz', (_req, res) => res.status(200).send('ok'));

app.listen(port, host, () => {
  console.log(`🚀 Dev server running at:`);
  console.log(`   • Local:   http://localhost:${port}`);
  console.log(`   • Network: http://${host}:${port}  (pour tester sur iPhone)`);
});
