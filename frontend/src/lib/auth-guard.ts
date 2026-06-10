/**
 * Authentication Guard
 * Checks if user is authenticated and redirects to login if not
 */

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;

  const token = localStorage.getItem('auth_token');
  const user = localStorage.getItem('user');
  const role = localStorage.getItem('enr-role');

  if (!(token && user && role)) return false;

  // Basic JWT expiry check — decode payload without a library
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      // Token expired — clear stale session immediately
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      localStorage.removeItem('enr-role');
      return false;
    }
  } catch {
    // Malformed token
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    localStorage.removeItem('enr-role');
    return false;
  }

  return true;
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}
