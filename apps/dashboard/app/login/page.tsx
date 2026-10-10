import type { Metadata } from "next";
import { LoginForm } from "../../components/pages/login/LoginForm";

export const metadata: Metadata = { title: "Нэвтрэх" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  // Only allow in-app paths as the post-login target.
  const target = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return <LoginForm next={target} />;
}
