import { Router } from 'express';
import { AuthedRequest, asyncHandler } from '../middleware';
import { pool } from '../db';

export const portfolioRouter = Router();

// Total market value grouped by asset class, on the LATEST snapshot date.
// tenant_id comes from the token, so a caller can only ever see their own rows.
portfolioRouter.get(
  '/portfolio/by-asset-class',
  asyncHandler(async (req: AuthedRequest, res) => {
    const tenantId = req.user!.tenantId;
    const result = await pool.query(
      `SELECT asset_class,
              SUM(quantity * price) AS market_value
       FROM holdings
       WHERE tenant_id = $1
         AND snapshot_date = (SELECT MAX(snapshot_date) FROM holdings WHERE tenant_id = $1)
       GROUP BY asset_class
       ORDER BY asset_class`,
      [tenantId],
    );
    const byAssetClass = result.rows.map((r) => ({
      assetClass: r.asset_class,
      marketValue: Number(r.market_value),
    }));
    return res.json({ byAssetClass });
  }),
);

// Period return = (end_mv - start_mv) / start_mv, where start = earliest date
// and end = latest date in this tenant's holdings.
portfolioRouter.get(
  '/portfolio/period-return',
  asyncHandler(async (req: AuthedRequest, res) => {
    const tenantId = req.user!.tenantId;
    const result = await pool.query(
      `WITH bounds AS (
         SELECT MIN(snapshot_date) AS start_date, MAX(snapshot_date) AS end_date
         FROM holdings WHERE tenant_id = $1
       )
       SELECT
         (SELECT SUM(quantity * price) FROM holdings, bounds
           WHERE tenant_id = $1 AND snapshot_date = bounds.start_date) AS start_mv,
         (SELECT SUM(quantity * price) FROM holdings, bounds
           WHERE tenant_id = $1 AND snapshot_date = bounds.end_date) AS end_mv,
         (SELECT start_date FROM bounds)::text AS start_date,
         (SELECT end_date FROM bounds)::text AS end_date`,
      [tenantId],
    );

    const row = result.rows[0];
    // No holdings at all → nothing to compute.
    if (!row || row.start_mv === null) {
      return res.json({
        periodReturn: null,
        startMarketValue: null,
        endMarketValue: null,
        startDate: null,
        endDate: null,
      });
    }

    const startMv = Number(row.start_mv);
    const endMv = Number(row.end_mv);
    // Guard divide-by-zero so we return null instead of NaN/Infinity.
    const periodReturn = startMv === 0 ? null : (endMv - startMv) / startMv;

    return res.json({
      periodReturn,
      startMarketValue: startMv,
      endMarketValue: endMv,
      startDate: row.start_date,
      endDate: row.end_date,
    });
  }),
);
