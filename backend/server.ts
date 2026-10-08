import 'dotenv/config';
import http from 'node:http';
import path from 'node:path';

import helmet from 'helmet';
import express from 'express';

import { handler } from './index';
import { attachRealtime } from './realtime-subscribers';

const PORT = Number(process.env.PORT || 4000);

const app = express();

app.disable('x-powered-by');

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

/*
 * API routes
 */
app.use(handler);

/*
 * Local uploaded-file storage.
 *
 * In production this can later be replaced by
 * S3 / MinIO / Cloudflare R2 / Azure Blob.
 */
const storageRoot = path.resolve(
  process.env.STORAGE_ROOT || './storage'
);

app.use(
  '/storage',
  express.static(storageRoot, {
    maxAge: '1h',
    index: false,
  })
);

/*
 * Health check
 */
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'gamersify-api',
    timestamp: new Date().toISOString(),
  });
});

const server = http.createServer(app);

attachRealtime(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('======================================');
  console.log('       GAMERSIFY API SERVER');
  console.log('======================================');
  console.log(`HTTP:      http://localhost:${PORT}`);
  console.log(`Health:    http://localhost:${PORT}/health`);
  console.log(`WebSocket: ws://localhost:${PORT}/ws`);
  console.log('======================================');
  console.log('');
});

process.on('SIGTERM', async () => {
  console.log('[SERVER] SIGTERM received');

  server.close(() => {
    console.log('[SERVER] HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('[SERVER] SIGINT received');

  server.close(() => {
    console.log('[SERVER] HTTP server closed');
    process.exit(0);
  });
});