// Centralized auth-aware fetch helper.
//
// All authenticated API calls should go through `authFetch` instead of the raw
// `fetch` + manual `Authorization: Bearer ...` header. authFetch will:
//   1. Attach the current access token from localStorage
//   2. If the request returns 401, try POST /auth/refresh once using the
//      stored refresh token, then retry the original request with the new
//      access token
//   3. If refresh also fails, clear local tokens and bounce the user to /login

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';

const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

export function getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_KEY);
}

export function setTokens(accessToken: string, refreshToken?: string | null) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACCESS_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
}

function redirectToLogin() {
    if (typeof window === 'undefined') return;
    if (window.location.pathname !== '/login') {
        window.location.href = '/login';
    }
}

// Singleton in-flight refresh — if multiple requests 401 at the same time we
// only fire one /auth/refresh and they all wait for the same result.
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
    if (refreshInFlight) return refreshInFlight;

    const refreshToken = typeof window !== 'undefined'
        ? localStorage.getItem(REFRESH_KEY)
        : null;
    if (!refreshToken) return null;

    refreshInFlight = (async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refreshToken }),
            });
            if (!res.ok) return null;
            const data: { access_token?: string; refresh_token?: string } = await res.json();
            if (!data.access_token) return null;
            setTokens(data.access_token, data.refresh_token);
            return data.access_token;
        } catch {
            return null;
        } finally {
            refreshInFlight = null;
        }
    })();

    return refreshInFlight;
}

interface AuthFetchOptions extends RequestInit {
    // Skip the auto-redirect on auth failure (used by callers that want to
    // handle 401 themselves, e.g. silent background polls).
    skipRedirectOnAuthFailure?: boolean;
}

export async function authFetch(path: string, options: AuthFetchOptions = {}): Promise<Response> {
    const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
    const { skipRedirectOnAuthFailure, ...fetchOptions } = options;

    const buildRequest = (token: string | null): RequestInit => {
        const headers = new Headers(fetchOptions.headers || {});
        if (token) headers.set('Authorization', `Bearer ${token}`);
        return { ...fetchOptions, headers };
    };

    let token = getAccessToken();
    let res = await fetch(url, buildRequest(token));
    if (res.status !== 401) return res;

    // Access token rejected — try refresh once.
    const newToken = await refreshAccessToken();
    if (!newToken) {
        clearTokens();
        if (!skipRedirectOnAuthFailure) redirectToLogin();
        return res;
    }

    token = newToken;
    res = await fetch(url, buildRequest(token));
    if (res.status === 401) {
        clearTokens();
        if (!skipRedirectOnAuthFailure) redirectToLogin();
    }
    return res;
}

// Plain fetch against the API base — useful for unauthenticated endpoints like
// /auth/login. Kept here so callers don't have to repeat the base URL logic.
export function apiUrl(path: string): string {
    return path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
}
