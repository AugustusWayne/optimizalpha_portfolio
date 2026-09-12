const TOKEN_KEY = 'northstar_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// Thin fetch wrapper: attaches the Bearer token and turns non-2xx responses
// into thrown Errors (with the server's { error } message when present).
async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(path, { ...options, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error || `Request failed (${res.status})`) as Error & {
      body?: unknown;
    };
    err.body = body;
    throw err;
  }
  return body;
}

export async function login(email: string, password: string): Promise<string> {
  const body = await request('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return body.token;
}

export function getByAssetClass() {
  return request('/api/portfolio/by-asset-class');
}

export function getPeriodReturn() {
  return request('/api/portfolio/period-return');
}

// Multipart upload: let the browser set the multipart boundary itself, so we
// only add the Authorization header (not Content-Type).
export async function uploadCsv(file: File) {
  const token = getToken();
  const form = new FormData();
  form.append('file', file);

  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error || 'Upload failed') as Error & {
      body?: { rows?: { row: number; message: string }[] };
    };
    err.body = body;
    throw err;
  }
  return body;
}
