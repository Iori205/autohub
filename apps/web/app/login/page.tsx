import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginView } from "../../components/auth/LoginView";

export const metadata: Metadata = { title: "Нэвтрэх", robots: { index: false } };

export default function LoginPage() {
  return (
    <Suspense>
      <LoginView />
    </Suspense>
  );
}
