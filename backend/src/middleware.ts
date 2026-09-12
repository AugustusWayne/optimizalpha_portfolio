import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me';

export interface AuthedRequest extends Request {
  user?: { userId: number; tenantId: number };
}

// Reads the Bearer token, verifies its signature, and attaches the identity to
// the request. Crucially, tenantId comes from the SIGNED token — never from a
// query param or the request body the caller controls.
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header.' });
  }
  const token = header.slice('Bearer '.length);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number; tenantId: number };
    req.user = { userId: payload.userId, tenantId: payload.tenantId };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

// Express 4 does not forward errors thrown in async handlers to the error
// handler. This wrapper catches rejected promises and passes them to next().
export const asyncHandler =
  (fn: RequestHandler): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
