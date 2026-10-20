import path from "node:path";
import process from "node:process";
import type { Browser, BrowserContext, Page } from "playwright";
import type { Result, Status } from "./types";

// Browsers are installed into node_modules (PLAYWRIGHT_BROWSERS_PATH=0).
process.env.PLAYWRIGHT_BROWSERS_PATH ??= "0";

export async function launch(): Promise<Browser> {
  const { chromium } = await import("playwright");
  return chromium.launch({ headless: true, channel: "chromium" });
}

/**
 * Collects console errors, page errors and failed / 5xx requests per page.
 * `expect4xx` lists URL parts whose 4xx answers are intended by a test.
 */
export function watch(page: Page, expect4xx: string[] = []) {
  const problems: string[] = [];
  /** URL parts whose next error response is intended by the running step (e.g. a simulated outage) */
  const allowed: string[] = [];
  page.on("pageerror", (e) => problems.push(`page error: ${e.message.split("\n")[0]}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    // the browser logs every non-2xx fetch; real failures are reported from responses below
    if (/Failed to load resource/.test(t)) return;
    problems.push(`console: ${t.slice(0, 200)}`);
  });
  page.on("requestfailed", (r) => {
    const f = r.failure()?.errorText ?? "";
    if (/ERR_ABORTED|NS_BINDING_ABORTED/.test(f)) return; // navigations cancel in-flight fetches
    problems.push(`request failed: ${r.method()} ${r.url()} ${f}`);
  });
  page.on("response", (r) => {
    const s = r.status();
    const i = s >= 400 ? allowed.findIndex((x) => r.url().includes(x)) : -1;
    if (i >= 0) {
      allowed.splice(i, 1);
      return;
    }
    if (s >= 500 || (s >= 400 && !expect4xx.some((x) => r.url().includes(x)) && !r.url().includes("favicon")))
      problems.push(`HTTP ${s}: ${r.request().method()} ${r.url()}`);
  });
  return Object.assign(problems, { allowOnce: (urlPart: string) => allowed.push(urlPart) });
}

/** One table row per user action; `check` throws on the first failed expectation. */
export class Suite {
  results: Result[] = [];
  constructor(
    private browserCtx: BrowserContext,
    private out: string,
  ) {}

  async step(page: string, action: string, fn: () => Promise<string | void>, opts: { status?: Status; page?: Page } = {}) {
    try {
      const note = (await fn()) ?? "";
      this.results.push({ page, action, status: opts.status ?? "ok", notes: note });
      process.stdout.write(`  ✓ ${page} · ${action}\n`);
    } catch (e) {
      // first non-empty line; Prisma puts the actual cause on the last one
      const lines = ((e as Error).message ?? String(e)).split("\n").map((l) => l.trim()).filter(Boolean);
      const msg = (lines[0]?.startsWith("Invalid `prisma") ? lines.at(-1) : lines[0]) ?? String(e);
      this.results.push({ page, action, status: "fail", notes: msg });
      process.stdout.write(`  ✗ ${page} · ${action} — ${msg}\n`);
      const shot = opts.page ?? this.browserCtx.pages()[0];
      await shot?.screenshot({ path: path.join(this.out, `fail-${slug(page)}-${slug(action)}.png`), fullPage: true }).catch(() => {});
    }
  }

  note(page: string, action: string, status: Status, notes: string) {
    this.results.push({ page, action, status, notes });
  }
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-zа-яөү0-9]+/gi, "-")
    .slice(0, 40);

export function expect(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

/** Decode the session cookie (JWT) to find the DB user behind a browser session. */
export async function sessionUserId(ctx: BrowserContext, cookie = "autohub_customer"): Promise<string> {
  const c = (await ctx.cookies()).find((x) => x.name === cookie);
  expect(c, `no ${cookie} cookie`);
  const payload = JSON.parse(Buffer.from(c.value.split(".")[1]!, "base64url").toString()) as { sub: string };
  return payload.sub;
}

/** Poll until `fn` returns a truthy value (DB writes from optimistic UI land a moment later). */
export async function eventually<T>(fn: () => Promise<T>, msg: string, ms = 8000): Promise<NonNullable<T>> {
  const end = Date.now() + ms;
  do {
    const last = await fn();
    if (last) return last as NonNullable<T>;
    await new Promise((r) => setTimeout(r, 250));
  } while (Date.now() < end);
  throw new Error(msg);
}
