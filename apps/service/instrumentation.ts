/** Сервер instance асахад нэг удаа ажиллана: production тохиргоо буруу бол үйлчлэхээс татгалзана. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { validateEnv } = await import("./lib/env");
  validateEnv();
}
