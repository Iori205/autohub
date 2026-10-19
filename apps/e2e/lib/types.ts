export interface Ctx {
  api: string;
  web: string;
  dashboard: string;
  authSecret: string;
  staffPassword: string;
  out: string;
}

/** ok = works, fixed = was broken and fixed in this round, todo = not wired (by design / needs UI), fail = broken now */
export type Status = "ok" | "fixed" | "todo" | "fail";

export interface Result {
  page: string;
  action: string;
  status: Status;
  notes: string;
}
