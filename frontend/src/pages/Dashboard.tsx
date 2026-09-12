import { useEffect, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getByAssetClass, getPeriodReturn } from '../api';
import Upload from './Upload';

interface AssetRow {
  assetClass: string;
  marketValue: number;
}
interface ReturnData {
  periodReturn: number | null;
  startDate: string | null;
  endDate: string | null;
}

const money = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [rows, setRows] = useState<AssetRow[]>([]);
  const [ret, setRet] = useState<ReturnData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // useCallback so the effect below has a stable reference and Upload can reuse
  // it to refetch after a successful upload.
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, r] = await Promise.all([getByAssetClass(), getPeriodReturn()]);
      setRows(a.byAssetClass);
      setRet(r);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalMv = rows.reduce((s, r) => s + r.marketValue, 0);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Northstar Portfolio</h1>
        <button onClick={onLogout} className="text-sm text-slate-600 underline">
          Log out
        </button>
      </header>

      <div className="mb-6">
        <Upload onUploaded={load} />
      </div>

      {/* Three explicit branches: loading, error, empty — then the data. */}
      {loading && <p>Loading…</p>}
      {error && <p className="text-red-700">{error}</p>}

      {!loading && !error && rows.length === 0 && (
        <p className="rounded bg-white p-4 shadow">
          No holdings yet — upload a CSV to get started.
        </p>
      )}

      {!loading && !error && rows.length > 0 && (
        <>
          <div className="mb-6 rounded-lg bg-white p-4 shadow">
            <h2 className="mb-1 font-semibold">Period return</h2>
            {ret && ret.periodReturn !== null ? (
              <p className="text-3xl font-bold">
                {(ret.periodReturn * 100).toFixed(2)}%
                <span className="ml-2 text-sm font-normal text-slate-500">
                  {ret.startDate} → {ret.endDate}
                </span>
              </p>
            ) : (
              <p className="text-slate-500">Not enough data to compute a return.</p>
            )}
          </div>

          <div className="mb-6 rounded-lg bg-white p-4 shadow">
            <h2 className="mb-2 font-semibold">Market value by asset class</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={rows}>
                <XAxis dataKey="assetClass" />
                <YAxis />
                <Tooltip formatter={(v: number) => money(v)} />
                {/* No enter animation: paints immediately and deterministically. */}
                <Bar dataKey="marketValue" fill="#334155" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-lg bg-white p-4 shadow">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2">Asset class</th>
                  <th className="py-2 text-right">Market value</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.assetClass} className="border-b">
                    <td className="py-2">{r.assetClass}</td>
                    <td className="py-2 text-right">{money(r.marketValue)}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="py-2">Total</td>
                  <td className="py-2 text-right">{money(totalMv)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
