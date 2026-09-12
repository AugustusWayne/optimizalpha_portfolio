import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateRows, RawRow } from './validate';

const goodRow: RawRow = {
  date: '2026-01-01',
  ticker: 'AAPL',
  asset_class: 'Equity',
  quantity: '100',
  price: '180.00',
};

test('accepts a clean row and coerces numbers', () => {
  const { holdings, errors } = validateRows([goodRow]);
  assert.equal(errors.length, 0);
  assert.equal(holdings.length, 1);
  assert.equal(holdings[0].quantity, 100);
  assert.equal(holdings[0].price, 180);
});

test('flags a missing field', () => {
  const { holdings, errors } = validateRows([{ ...goodRow, price: '' }]);
  assert.equal(holdings.length, 0);
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /Missing field/);
});

test('flags a bad date', () => {
  const { errors } = validateRows([{ ...goodRow, date: '2026-13-40' }]);
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /Invalid date/);
});

test('flags a duplicate (same ticker on the same date)', () => {
  const { holdings, errors } = validateRows([goodRow, { ...goodRow }]);
  assert.equal(holdings.length, 1); // first kept
  assert.equal(errors.length, 1); // second rejected
  assert.match(errors[0].message, /Duplicate/);
});
