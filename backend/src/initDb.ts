import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { pool } from './db';

// Runs the migration and seeds the two documented accounts. Idempotent: safe
// to run on every boot (CREATE TABLE IF NOT EXISTS + a "seed only if empty").
export async function initDb(): Promise<void> {
  const migrationPath = path.join(__dirname, '..', 'db', 'migrations', '001_init.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  await pool.query(sql);
  await seed();
}

async function seed(): Promise<void> {
  const existing = await pool.query('SELECT COUNT(*)::int AS count FROM users');
  if (existing.rows[0].count > 0) return; // already seeded

  // bcrypt hash generated at seed time — we never store the plaintext password.
  const passwordHash = await bcrypt.hash('Password123!', 10);

  await pool.query(
    `INSERT INTO tenants (id, name) VALUES (1, $1), (2, $2)
     ON CONFLICT (id) DO NOTHING`,
    ['Alpha Capital', 'Beacon Advisors'],
  );
  // Keep the SERIAL sequence ahead of the explicit ids we just inserted.
  await pool.query(`SELECT setval('tenants_id_seq', (SELECT MAX(id) FROM tenants))`);

  await pool.query(
    `INSERT INTO users (tenant_id, email, password_hash)
     VALUES (1, $1, $3), (2, $2, $3)`,
    ['tenant_a@example.com', 'tenant_b@example.com', passwordHash],
  );

  console.log('Seeded 2 tenants and 2 users.');
}
