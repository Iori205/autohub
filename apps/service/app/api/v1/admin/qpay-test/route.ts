import { requireStaff } from "@/lib/auth";
import { ApiError, ok, route } from "@/lib/http";
import { demoMode } from "@/lib/payments";
import { qpayConfig, qpayConfigured, testConnection } from "@/lib/qpay";

/** Тохиргоо → QPay → «Холболт шалгах» (ADMIN). Нэвтрэх мэдээллийг хэзээ ч буцаахгүй. */
export const POST = route(async (req) => {
  await requireStaff(req, "ADMIN");
  const env = qpayConfig().baseUrl.includes("sandbox") ? "sandbox" : "production";
  if (!qpayConfigured())
    return ok({ ok: false, message: demoMode() ? "DEMO_MODE: QPay merchant тохируулаагүй, нэхэмжлэх дотооддоо үүснэ" : "QPay merchant тохируулаагүй (.env: QPAY_USERNAME, QPAY_PASSWORD, QPAY_INVOICE_CODE)" });
  try {
    await testConnection();
    return ok({ ok: true, message: `QPay ${env} холболт амжилттай · token хүчинтэй` });
  } catch (e) {
    return ok({ ok: false, message: `Холболт амжилтгүй: ${e instanceof ApiError ? e.message : "алдаа"}` });
  }
});
