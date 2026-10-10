// Server-safe auth constants (used by proxy.ts and the client).

/** Mock session cookie. apps/service will issue an httpOnly cookie with the same role. */
export const SESSION_COOKIE = "autohub_admin_session";

export const LOGIN_PATH = "/login";
