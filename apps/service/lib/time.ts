/** Business days are Ulaanbaatar days (UTC+8, no DST). */
const UB_OFFSET = 8 * 60 * 60e3;

/** "2026-10-11" for the UB calendar day containing `d` */
export const ubDay = (d: Date = new Date()) => new Date(d.getTime() + UB_OFFSET).toISOString().slice(0, 10);

/** Start of a UB day as a Date */
export const ubStart = (day: string) => new Date(`${day}T00:00:00+08:00`);

/** Start of the next UB day (exclusive end of `day`) */
export const ubEnd = (day: string) => new Date(ubStart(day).getTime() + 24 * 60 * 60e3);

export const addDays = (day: string, n: number) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const dateOnly = (d: Date) => d.toISOString().slice(0, 10);
