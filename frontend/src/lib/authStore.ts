import { BehaviorSubject, map, distinctUntilChanged } from "rxjs";

export interface AuthState {
  token: string | null;
  email: string | null;
  role: string | null;
}

const STORAGE_KEY = "hilton_auth";

function loadFromStorage(): AuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { token: null, email: null, role: null };
    return JSON.parse(raw) as AuthState;
  } catch {
    return { token: null, email: null, role: null };
  }
}

const authState$ = new BehaviorSubject<AuthState>(loadFromStorage());

authState$.subscribe((state) => {
  if (state.token) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
});

export const isAuthenticated$ = authState$.pipe(
  map((s) => Boolean(s.token)),
  distinctUntilChanged(),
);

export const userRole$ = authState$.pipe(
  map((s) => s.role),
  distinctUntilChanged(),
);

export function getToken(): string | null {
  return authState$.getValue().token;
}

export function getAuthState(): AuthState {
  return authState$.getValue();
}

export function setAuth(token: string, email: string, role: string): void {
  authState$.next({ token, email, role });
}

export function clearAuth(): void {
  authState$.next({ token: null, email: null, role: null });
}

function parseJwt(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split(".")[1];
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export async function login(
  email: string,
  password: string,
): Promise<{ success: boolean; error?: string }> {
  const API_BASE = import.meta.env.VITE_API_BASE ?? "";
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return {
        success: false,
        error: body?.message ?? "Invalid credentials",
      };
    }

    const { accessToken } = (await res.json()) as { accessToken: string };
    const payload = parseJwt(accessToken);
    setAuth(
      accessToken,
      (payload?.email as string) ?? email,
      (payload?.role as string) ?? "EMPLOYEE",
    );
    return { success: true };
  } catch {
    return { success: false, error: "Network error" };
  }
}

export function logout(): void {
  clearAuth();
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
