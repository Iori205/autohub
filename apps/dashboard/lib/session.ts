// Server-safe auth constants (used by proxy.ts and the client).

/** httpOnly staff session cookie issued by apps/service (POST /admin/auth/login). */
export const SESSION_COOKIE = "autohub_admin_session";

export const LOGIN_PATH = "/login";
