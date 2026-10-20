import type { Metadata } from "next";
import { LoginForm } from "../../components/pages/login/LoginForm";

export const metadata: Metadata = { title: "Нэвтрэх" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  // Нэвтэрсний дараа зөвхөн апп доторх зам руу шилжүүлнэ (open redirect-ээс сэргийлнэ).
  const target = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return <LoginForm next={target} />;
}
