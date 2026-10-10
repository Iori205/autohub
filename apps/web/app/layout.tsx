import type { Metadata, Viewport } from "next";
import { Fira_Sans_Extra_Condensed, JetBrains_Mono, Manrope } from "next/font/google";
import "@repo/ui/theme.css";
import "./globals.css";
import { Header } from "../components/layout/Header";
import { Footer } from "../components/layout/Footer";
import { TrustStrip } from "../components/layout/TrustStrip";
import { ChatWidget } from "../components/layout/ChatWidget";
import { Toast } from "../components/layout/Toast";
import { getCategories } from "../lib/api/catalog";
import { STORE_NAME, themeInitScript } from "../lib/site";

const fira = Fira_Sans_Extra_Condensed({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-fira",
});
const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: { default: `${STORE_NAME} — Авто сэлбэг`, template: `%s · ${STORE_NAME}` },
  description:
    "Оригинал болон баталгаат аналог авто сэлбэгийг Улаанбаатарт хүргэнэ.",
};

export const viewport: Viewport = {
  themeColor: "#050505",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const categories = await getCategories();
  return (
    <html
      lang="mn"
      className={`${fira.variable} ${manrope.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Header categories={categories} />
        {children}
        <TrustStrip />
        <Footer />
        <ChatWidget />
        <Toast />
      </body>
    </html>
  );
}
