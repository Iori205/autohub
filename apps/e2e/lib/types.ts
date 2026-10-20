export interface Ctx {
  api: string;
  web: string;
  dashboard: string;
  authSecret: string;
  staffPassword: string;
  out: string;
}

/** ok = ажиллаж байна, fixed = энэ удаад зассан, todo = холбоогүй (санаатай / UI хэрэгтэй), fail = эвдэрсэн */
export type Status = "ok" | "fixed" | "todo" | "fail";

export interface Result {
  page: string;
  action: string;
  status: Status;
  notes: string;
}
