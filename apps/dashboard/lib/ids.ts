/** Client-side id for records created in the mock backend (the service will assign real ones). */
export const newId = (prefix: string) =>
  `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
