import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me';

export async function login(req: Request, res: Response) {
  // Input validation first.
  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  // Parameterized query ($1) — the driver sends the value separately from the
  // SQL text, so a malicious email can never change the query's meaning.
  const result = await pool.query(
    'SELECT id, tenant_id, password_hash FROM users WHERE email = $1',
    [email],
  );
  const user = result.rows[0];

  // Same generic 401 whether the email is unknown or the password is wrong, so
  // we don't reveal which emails exist. bcrypt.compare re-hashes the input with
  // the stored salt and compares in constant time (no plain string ==).
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = jwt.sign(
    { userId: user.id, tenantId: user.tenant_id },
    JWT_SECRET,
    { expiresIn: '8h' },
  );
  return res.json({ token });
}
