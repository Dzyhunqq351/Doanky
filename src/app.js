import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import api from './routes/api.js';
const app = express();
// Vercel/reverse proxies terminate HTTPS before forwarding to Express.
app.set('trust proxy', 1);
const dist = fileURLToPath(new URL('../client/dist/', import.meta.url));
app.use(helmet());
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use(express.json({ limit: '10kb' }));
app.use('/api', api);
app.use('/api', (_req, res) => res.status(404).json({ message: 'API không tồn tại.' }));
app.use(express.static(dist));
app.get('/{*path}', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({
    message: status < 500 || status === 503 ? err.message : 'Có lỗi máy chủ. Vui lòng thử lại.',
  });
});
export default app;
