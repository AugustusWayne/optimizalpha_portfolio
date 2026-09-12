import { useState } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { getToken, clearToken } from './api';

export default function App() {
  // Simple auth gate: token present → Dashboard, else Login. No router needed
  // for a two-screen app.
  const [authed, setAuthed] = useState<boolean>(!!getToken());

  function handleLogout() {
    clearToken();
    setAuthed(false);
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {authed ? (
        <Dashboard onLogout={handleLogout} />
      ) : (
        <Login onLoggedIn={() => setAuthed(true)} />
      )}
    </div>
  );
}
