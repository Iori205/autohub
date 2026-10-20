/** Ажлын өдөр нь Улаанбаатарын өдөр (UTC+8, зуны цаггүй). */
const UB_OFFSET = 8 * 60 * 60e3;

/** `d`-г агуулах УБ хуанлийн өдөр, «2026-10-11» */
export const ubDay = (d: Date = new Date()) => new Date(d.getTime() + UB_OFFSET).toISOString().slice(0, 10);

/** УБ өдрийн эхлэл (Date) */
export const ubStart = (day: string) => new Date(`${day}T00:00:00+08:00`);

/** Дараагийн УБ өдрийн эхлэл (`day`-ийн онгорхой төгсгөл) */
export const ubEnd = (day: string) => new Date(ubStart(day).getTime() + 24 * 60 * 60e3);

export const addDays = (day: string, n: number) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const dateOnly = (d: Date) => d.toISOString().slice(0, 10);
