import type { Metadata, Viewport } from "next";
import { Fira_Sans_Extra_Condensed, JetBrains_Mono, Manrope } from "next/font/google";
import "@repo/ui/theme.css";
import "./globals.css";
import { Header } from "../components/layout/Header";
import { Footer } from "../components/layout/Footer";
import { TrustStrip } from "../components/layout/TrustStrip";
import { ChatWidget } from "../components/layout/ChatWidget";
import { Toast } from "../components/layout/Toast";
import { StoreChrome } from "../components/layout/StoreChrome";
import { getCategories, getSiteSettings } from "../lib/api/catalog";
import { themeInitScript } from "../lib/site";
import { SiteProvider } from "../lib/site-context";
import { toStoreInfo } from "../lib/store-info";

const fira = Fira_Sans_Extra_Condensed({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-fira",
});
const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  // variable font (200–800): one file covers every weight the UI uses
  // (a fixed 5-weight list trips a Turbopack production-build bug in next/font)
  variable: "--font-manrope",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
});

export async function generateMetadata(): Promise<Metadata> {
  const { store } = await getSiteSettings();
  return {
    title: { default: `${store.name} — Авто сэлбэг`, template: `%s · ${store.name}` },
    description: "Оригинал болон баталгаат аналог авто сэлбэгийг Улаанбаатарт хүргэнэ.",
  };
}

export const viewport: Viewport = {
  themeColor: "#050505",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [categories, settings] = await Promise.all([getCategories(), getSiteSettings()]);
  return (
    <html
      lang="mn"
      // Browser translation (Google Translate) rewrites text nodes and breaks React updates
      translate="no"
      className={`${fira.variable} ${manrope.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <head>
        <meta name="google" content="notranslate" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <SiteProvider store={toStoreInfo(settings.store)}>
          <StoreChrome>
            <Header categories={categories} />
          </StoreChrome>
          {children}
          <StoreChrome>
            <TrustStrip />
            <Footer />
            <ChatWidget />
          </StoreChrome>
          <Toast />
        </SiteProvider>
      </body>
    </html>
  );
}
