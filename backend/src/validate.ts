// CSV validation. Catches all three issue types the brief lists — missing
// field, bad date, duplicate row — not just the one planted in the sample.

export interface RawRow {
  date?: string;
  ticker?: string;
  asset_class?: string;
  quantity?: string;
  price?: string;
}

export interface ValidHolding {
  snapshotDate: string;
  ticker: string;
  assetClass: string;
  quantity: number;
  price: number;
}

export interface RowError {
  row: number; // 1-based data row number (header excluded)
  message: string;
}

const REQUIRED = ['date', 'ticker', 'asset_class', 'quantity', 'price'] as const;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function validateRows(rows: RawRow[]): {
  holdings: ValidHolding[];
  errors: RowError[];
} {
  const errors: RowError[] = [];
  const holdings: ValidHolding[] = [];
  const seen = new Set<string>(); // natural key: date|ticker

  rows.forEach((row, i) => {
    const rowNum = i + 1;

    // (1) missing field
    const missing = REQUIRED.filter((f) => {
      const v = row[f];
      return v === undefined || String(v).trim() === '';
    });
    if (missing.length > 0) {
      errors.push({ row: rowNum, message: `Missing field(s): ${missing.join(', ')}.` });
      return;
    }

    // (2) bad date — must be YYYY-MM-DD AND a real calendar date
    const date = row.date!.trim();
    if (!ISO_DATE.test(date) || Number.isNaN(Date.parse(date))) {
      errors.push({ row: rowNum, message: `Invalid date "${row.date}" (expected YYYY-MM-DD).` });
      return;
    }

    // numeric sanity — a non-number here would silently poison the totals
    const quantity = Number(row.quantity);
    const price = Number(row.price);
    if (!Number.isFinite(quantity) || quantity < 0) {
      errors.push({ row: rowNum, message: `Invalid quantity "${row.quantity}".` });
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      errors.push({ row: rowNum, message: `Invalid price "${row.price}".` });
      return;
    }

    // (3) duplicate row — same ticker reported twice for the same date
    const key = `${date}|${row.ticker!.trim().toUpperCase()}`;
    if (seen.has(key)) {
      errors.push({ row: rowNum, message: `Duplicate row for ${row.ticker!.trim()} on ${date}.` });
      return;
    }
    seen.add(key);

    holdings.push({
      snapshotDate: date,
      ticker: row.ticker!.trim(),
      assetClass: row.asset_class!.trim(),
      quantity,
      price,
    });
  });

  return { holdings, errors };
}
