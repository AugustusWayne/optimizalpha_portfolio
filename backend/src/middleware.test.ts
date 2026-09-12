import { test } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { requireAuth } from './middleware';

// requireAuth falls back to this secret when JWT_SECRET is unset (as in tests).
const SECRET = 'dev-only-insecure-secret-change-me';

// Minimal Express res mock — captures the status/body the handler sets.
// `any` here keeps the mock small; typing a full Response adds noise, no value.
function makeRes() {
  const captured: { status?: number; body?: unknown } = {};
  const res: any = {};
  res.status = (code: number) => {
    captured.status = code;
    return res;
  };
  res.json = (payload: unknown) => {
    captured.body = payload;
    return res;
  };
  return { res, captured };
}

test('valid token: tenantId comes from the signed payload', () => {
  const token = jwt.sign({ userId: 7, tenantId: 42 }, SECRET);
  const req: any = { headers: { authorization: `Bearer ${token}` }, query: {} };
  const { res } = makeRes();

  let nextCalled = false;
  requireAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.user.tenantId, 42);
});

test('a ?tenantId query param CANNOT override the token tenant', () => {
  // The whole isolation guarantee in one assertion: the caller asks for tenant 1,
  // but their token says tenant 42 — the token wins.
  const token = jwt.sign({ userId: 7, tenantId: 42 }, SECRET);
  const req: any = { headers: { authorization: `Bearer ${token}` }, query: { tenantId: '1' } };
  const { res } = makeRes();

  requireAuth(req, res, () => {});

  assert.equal(req.user.tenantId, 42); // NOT 1
});

test('a tampered token is rejected with 401', () => {
  const req: any = { headers: { authorization: 'Bearer not.a.real.token' }, query: {} };
  const { res, captured } = makeRes();

  let nextCalled = false;
  requireAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(captured.status, 401);
});

test('a missing Authorization header is rejected with 401', () => {
  const req: any = { headers: {}, query: {} };
  const { res, captured } = makeRes();

  requireAuth(req, res, () => {});

  assert.equal(captured.status, 401);
});
