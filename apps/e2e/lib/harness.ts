import path from "node:path";
import process from "node:process";
import type { Browser, BrowserContext, Page } from "playwright";
import type { Result, Status } from "./types";

// Хөтчүүдийг node_modules-д суулгасан (PLAYWRIGHT_BROWSERS_PATH=0).
process.env.PLAYWRIGHT_BROWSERS_PATH ??= "0";

export async function launch(): Promise<Browser> {
  const { chromium } = await import("playwright");
  return chromium.launch({ headless: true, channel: "chromium" });
}

/**
 * Хуудас бүрийн console алдаа, page error, амжилтгүй / 5xx хүсэлтийг цуглуулна.
 * `expect4xx` нь тестийн санаатай 4xx хариутай URL хэсгүүд.
 */
export function watch(page: Page, expect4xx: string[] = []) {
  const problems: string[] = [];
  /** Ажиллаж буй алхмын санаатай алдаатай хариутай URL хэсгүүд (жишээ нь QPay тасалдлыг дуурайх) */
  const allowed: string[] = [];
  page.on("pageerror", (e) => problems.push(`page error: ${e.message.split("\n")[0]}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    // хөтөч 2xx бус fetch бүрийг log-лодог; жинхэнэ алдааг доорх хариунаас мэдээлнэ
    if (/Failed to load resource/.test(t)) return;
    problems.push(`console: ${t.slice(0, 200)}`);
  });
  page.on("requestfailed", (r) => {
    const f = r.failure()?.errorText ?? "";
    if (/ERR_ABORTED|NS_BINDING_ABORTED/.test(f)) return; // шилжилт явагдаж буй fetch-ийг цуцалдаг
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

/** Хэрэглэгчийн үйлдэл бүрт хүснэгтийн нэг мөр; `check` эхний биелээгүй хүлээлт дээр алдаа шиднэ. */
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
      // эхний хоосон биш мөр; Prisma жинхэнэ шалтгааныг сүүлийн мөрд бичдэг
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

/** Сессийн күүкиг (JWT) задалж хөтчийн сессийн ард байгаа DB хэрэглэгчийг олно. */
export async function sessionUserId(ctx: BrowserContext, cookie = "autohub_customer"): Promise<string> {
  const c = (await ctx.cookies()).find((x) => x.name === cookie);
  expect(c, `no ${cookie} cookie`);
  const payload = JSON.parse(Buffer.from(c.value.split(".")[1]!, "base64url").toString()) as { sub: string };
  return payload.sub;
}

/** `fn` truthy утга буцаах хүртэл давтан шалгана (optimistic UI-ийн DB бичилт бага зэрэг хоцордог). */
export async function eventually<T>(fn: () => Promise<T>, msg: string, ms = 8000): Promise<NonNullable<T>> {
  const end = Date.now() + ms;
  do {
    const last = await fn();
    if (last) return last as NonNullable<T>;
    await new Promise((r) => setTimeout(r, 250));
  } while (Date.now() < end);
  throw new Error(msg);
}
