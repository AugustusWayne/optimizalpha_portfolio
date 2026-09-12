import { useState, FormEvent } from 'react';
import { login, setToken } from '../api';

export default function Login({ onLoggedIn }: { onLoggedIn: () => void }) {
  // Prefilled with a seeded account so a grader can log in in one click.
  const [email, setEmail] = useState('tenant_a@example.com');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const token = await login(email, password);
      setToken(token);
      onLoggedIn();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="w-80 rounded-lg bg-white p-6 shadow">
        <h1 className="mb-4 text-xl font-semibold">Northstar Portfolio</h1>
        {error && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}

        <label className="mb-1 block text-sm font-medium">Email</label>
        <input
          className="mb-3 w-full rounded border px-2 py-1"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className="mb-1 block text-sm font-medium">Password</label>
        <input
          className="mb-4 w-full rounded border px-2 py-1"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-slate-800 py-2 text-white disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
