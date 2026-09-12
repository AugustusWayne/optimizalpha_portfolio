import express from 'express';
import { login } from './auth';
import { requireAuth, asyncHandler } from './middleware';
import { uploadRouter } from './routes/upload';
import { portfolioRouter } from './routes/portfolio';
import { initDb } from './initDb';

const app = express();
app.use(express.json());

// Public.
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.post('/api/login', asyncHandler(login));

// Everything below requires a valid token. requireAuth runs first, so no
// portfolio/upload handler is ever reached without a verified tenantId.
app.use('/api', requireAuth, uploadRouter);
app.use('/api', requireAuth, portfolioRouter);

// Central error handler — log the detail server-side, return a generic message
// so we never leak stack traces to the client.
app.use(
  (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  },
);

const PORT = Number(process.env.PORT || 4000);

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`API listening on :${PORT}`));
  })
  .catch((e) => {
    console.error('Failed to initialize database', e);
    process.exit(1);
  });
