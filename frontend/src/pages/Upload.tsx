import { useState, ChangeEvent } from 'react';
import { uploadCsv } from '../api';

export default function Upload({ onUploaded }: { onUploaded: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ row: number; message: string }[]>([]);
  const [busy, setBusy] = useState(false);

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null);
    setStatus(null);
    setErrors([]);
  }

  async function handleUpload() {
    if (!file) return;
    setBusy(true);
    setStatus(null);
    setErrors([]);
    try {
      const res = await uploadCsv(file);
      setStatus(`Uploaded ${res.inserted} rows.`);
      onUploaded(); // tell the dashboard to refetch
    } catch (err) {
      const e = err as Error & { body?: { rows?: { row: number; message: string }[] } };
      setStatus(e.message);
      if (e.body?.rows) setErrors(e.body.rows);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <h2 className="mb-2 font-semibold">Upload holdings CSV</h2>
      <div className="flex items-center gap-2">
        <input type="file" accept=".csv" onChange={handleFile} />
        <button
          onClick={handleUpload}
          disabled={!file || busy}
          className="rounded bg-slate-800 px-3 py-1 text-white disabled:opacity-50"
        >
          {busy ? 'Uploading…' : 'Upload'}
        </button>
      </div>

      {status && <p className="mt-2 text-sm">{status}</p>}

      {errors.length > 0 && (
        <ul className="mt-2 max-h-40 overflow-auto rounded bg-red-50 p-2 text-sm text-red-700">
          {errors.map((e, i) => (
            <li key={i}>
              Row {e.row}: {e.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
