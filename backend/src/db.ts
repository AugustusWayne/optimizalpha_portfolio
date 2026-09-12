import { Pool } from 'pg';

// ONE pool for the whole process. A pool keeps a small set of reusable
// connections; opening a fresh connection per query would be slow and would
// exhaust Postgres' connection limit under any real load.
export const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'northstar',
  password: process.env.PGPASSWORD || 'northstar',
  database: process.env.PGDATABASE || 'northstar',
});
