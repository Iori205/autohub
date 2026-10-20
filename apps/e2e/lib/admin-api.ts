/** Cross-app шалгалтын хамгийн энгийн ажилтны API клиент (самбарын хэрэглэгчийн хийх үйлдэл). */
export async function adminApi(api: string, password: string, email = "admin@autohub.mn") {
  const login = await fetch(`${api}/api/v1/admin/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!login.ok) throw new Error(`admin login failed: ${login.status}`);
  const cookie = login.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  return async <T = unknown>(method: string, path: string, body?: unknown): Promise<{ status: number; json: T }> => {
    const r = await fetch(`${api}/api/v1${path}`, {
      method,
      headers: { cookie, ...(body !== undefined ? { "content-type": "application/json" } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await r.text();
    return { status: r.status, json: (text ? JSON.parse(text) : null) as T };
  };
}
