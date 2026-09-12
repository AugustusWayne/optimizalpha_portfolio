# Northstar Portfolio

A small multi-tenant investment dashboard. Each tenant logs in, uploads a CSV of
holdings scoped to their own tenant, and sees total market value by asset class
(table + chart) plus a period return.

**Stack:** React + TypeScript + Vite + Tailwind (frontend) · Node.js + Express +
TypeScript (backend) · PostgreSQL (backend + DB via Docker Compose).

## Prerequisites

- Docker + Docker Compose
- Node.js 18+ (for the frontend dev server)

## Run it

**1. Start Postgres + the API** (one command; the API auto-runs the migration and
seeds the two accounts on first boot):

```bash
docker compose up --build
```

The API is on http://localhost:4000 (health check: `GET /api/health`).

**2. Start the frontend** (in a second terminal):

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The Vite dev server proxies `/api/*` to the backend,
so there's no CORS setup in dev.

### Seeded logins

| Email | Password | Tenant |
|---|---|---|
| `tenant_a@example.com` | `Password123!` | Alpha Capital |
| `tenant_b@example.com` | `Password123!` | Beacon Advisors |

Sample files `sample_good.csv` and `sample_dirty.csv` are in the repo root.

### Happy path

1. Log in as `tenant_a@example.com` (the form is prefilled).
2. Upload `sample_good.csv`.
3. Dashboard shows: period return **4.10%**, and market value by asset class
   (Equity $55,850 · Bond $35,550 · Cash $5,000 · Total $96,400).
4. Upload `sample_dirty.csv` → rejected with a clear message pointing at the
   duplicate row. Nothing is written.

## How tenant isolation works

The JWT issued at login carries `{ userId, tenantId }`. On every protected
request, `requireAuth` verifies the token's signature and sets `req.user` from
its **signed** payload. Every DB query filters by `req.user.tenantId` — the
client never supplies a tenant id, so a `?tenantId=` param or a crafted body is
simply ignored. There is no endpoint that takes a tenant id from the caller.

### Verify it yourself

```bash
# Log in as both tenants
TOKEN_A=$(curl -s -X POST localhost:4000/api/login -H 'Content-Type: application/json' \
  -d '{"email":"tenant_a@example.com","password":"Password123!"}' | sed 's/.*"token":"//;s/".*//')
TOKEN_B=$(curl -s -X POST localhost:4000/api/login -H 'Content-Type: application/json' \
  -d '{"email":"tenant_b@example.com","password":"Password123!"}' | sed 's/.*"token":"//;s/".*//')

# A uploads, B should see nothing — even when trying to smuggle a tenant id
curl -s -X POST localhost:4000/api/upload -H "Authorization: Bearer $TOKEN_A" -F "file=@sample_good.csv"
curl -s "localhost:4000/api/portfolio/by-asset-class?tenantId=1" -H "Authorization: Bearer $TOKEN_B"
# => {"byAssetClass":[]}   (B's data, not A's)

# No token / bad token => 401
curl -s -o /dev/null -w "%{http_code}\n" localhost:4000/api/portfolio/by-asset-class
```

## Tests

A few focused tests, run with Node's built-in test runner (no extra test
dependency):

```bash
cd backend
npm install
npm test
```

- `validate.test.ts` — the CSV validator, one case per issue type (missing
  field, bad date, duplicate).
- `middleware.test.ts` — the tenant-isolation invariant: `tenantId` is read from
  the signed token, and a `?tenantId=` param cannot override it.

## Assumptions

- **One snapshot set per tenant, replaced on each upload.** Re-uploading replaces
  the tenant's holdings inside a transaction (idempotent; no accumulation).
- **CSV format** is `date,ticker,asset_class,quantity,price`, dates `YYYY-MM-DD`.
- **Reject-the-whole-file on any bad row.** For financial data, partial ingestion
  would silently corrupt the computed totals, so a bad file is rejected wholesale
  with a per-row error list.
- **"Duplicate"** means the same ticker reported twice for the same snapshot date.
- **Market value by asset class** is computed on the latest snapshot date;
  **period return** uses the earliest date as start and the latest as end.
- Passwords are bcrypt-hashed at seed time; no signup flow (out of scope).

## What I'd add with more time

- **A full API-level integration test** for tenant isolation (spin up a test DB,
  upload as A, assert B gets nothing). The unit test on `requireAuth` already
  pins the invariant; the integration test would cover the query layer too.
- **httpOnly cookie for the token** instead of localStorage, to remove the XSS
  read surface (chose localStorage here for simplicity — see trade-off below).
- **Refresh tokens / token expiry handling** in the UI (currently an expired
  token just bounces you to a 401; the app doesn't auto-redirect to login yet).
- **Code-split the frontend bundle** — Recharts pushes it past 500KB; fine for an
  internal tool, but `manualChunks` would trim it.
- A **date-range / asset-class filter** on the dashboard (nice-to-have, skipped to
  stay in scope).

## Notes / trade-offs

- **JWT over sessions:** stateless, no session store needed for a small stateless
  API. Trade-off: can't revoke a token before it expires (8h here).
- **localStorage over httpOnly cookie:** simpler and no CSRF concern; the cost is
  that a successful XSS could read the token. For a screening exercise I chose the
  simpler option and documented it.
- **`docker compose` runs Postgres + API only.** The frontend runs via `vite dev`
  (the brief allows either that or Nginx). Host DB port is mapped to **5433** to
  avoid colliding with a local Postgres.
- The dev JWT secret has an insecure fallback so `docker compose up` works with
  zero setup; override `JWT_SECRET` for anything real. See `.env.example`.
