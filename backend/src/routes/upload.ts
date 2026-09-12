import { Router } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { AuthedRequest, asyncHandler } from '../middleware';
import { pool } from '../db';
import { validateRows, RawRow } from '../validate';

// Buffer the small upload in memory; cap at 2 MB so a huge file can't OOM us.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

export const uploadRouter = Router();

uploadRouter.post(
  '/upload',
  upload.single('file'),
  asyncHandler(async (req: AuthedRequest, res) => {
    // Input validation first.
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded (field name must be "file").' });
    }

    let rows: RawRow[];
    try {
      rows = parse(req.file.buffer, { columns: true, skip_empty_lines: true, trim: true });
    } catch {
      return res.status(400).json({ error: 'Could not parse CSV.' });
    }

    const { holdings, errors } = validateRows(rows);

    // Reject the WHOLE file on any bad row. Partial ingestion would silently
    // corrupt the very numbers this app computes.
    if (errors.length > 0) {
      return res.status(422).json({
        error: `CSV rejected: ${errors.length} invalid row(s). Fix and re-upload.`,
        rows: errors,
      });
    }
    if (holdings.length === 0) {
      return res.status(422).json({ error: 'CSV contained no data rows.' });
    }

    const tenantId = req.user!.tenantId;

    // Replace-on-upload: each upload is the tenant's current snapshot set.
    // Wrapped in a transaction so we never leave holdings half-deleted.
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM holdings WHERE tenant_id = $1', [tenantId]);
      for (const h of holdings) {
        await client.query(
          `INSERT INTO holdings (tenant_id, snapshot_date, ticker, asset_class, quantity, price)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [tenantId, h.snapshotDate, h.ticker, h.assetClass, h.quantity, h.price],
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      // 23505 = unique_violation. The validator normally catches dupes first;
      // this is the last-resort guard, translated to a clean 422 (not a 500).
      if ((e as { code?: string }).code === '23505') {
        return res
          .status(422)
          .json({ error: 'Duplicate holding (same ticker/date) rejected by the database.' });
      }
      throw e;
    } finally {
      client.release();
    }

    return res.json({ inserted: holdings.length });
  }),
);
