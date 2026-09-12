-- Single migration: creates the three tables the app needs.
-- Run automatically by the API on startup (see backend/src/initDb.ts).

CREATE TABLE IF NOT EXISTS tenants (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  tenant_id     INTEGER NOT NULL REFERENCES tenants(id),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL
);

-- Row-level tenancy: every holding carries the tenant_id it belongs to.
-- All reads/writes are filtered by this column (see the middleware + routes).
CREATE TABLE IF NOT EXISTS holdings (
  id            SERIAL PRIMARY KEY,
  tenant_id     INTEGER NOT NULL REFERENCES tenants(id),
  snapshot_date DATE NOT NULL,
  ticker        TEXT NOT NULL,
  asset_class   TEXT NOT NULL,
  quantity      NUMERIC(20, 4) NOT NULL,
  price         NUMERIC(20, 4) NOT NULL,
  -- Defense-in-depth: the DB refuses a duplicate holding even if the app-layer
  -- validator ever regresses. This also indexes (tenant_id, ...), so it doubles
  -- as the index for tenant-scoped reads — no separate index needed.
  CONSTRAINT uq_holdings_tenant_date_ticker UNIQUE (tenant_id, snapshot_date, ticker)
);
