/** Runs once when a server instance starts: refuse to serve with a broken production config. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { validateEnv } = await import("./lib/env");
  validateEnv();
}
