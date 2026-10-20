// Сервер талд ч ашиглаж болно: тохиргооны хуудас ?tab=-ийг сервер дээр шалгана.

export const SETTINGS_TABS = ["store", "delivery", "qpay", "admins"] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number];

export const isSettingsTab = (t: unknown): t is SettingsTab =>
  SETTINGS_TABS.includes(t as SettingsTab);
