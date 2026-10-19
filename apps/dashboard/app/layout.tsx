import type { Metadata, Viewport } from "next";
import { Fira_Sans_Extra_Condensed, JetBrains_Mono, Manrope } from "next/font/google";
import "@repo/ui/theme.css";
import "./globals.css";
import { Overlays } from "../components/ui/Overlays";
import { APP_NAME, themeInitScript } from "../lib/site";

// Same fonts as apps/web.
const fira = Fira_Sans_Extra_Condensed({
  subsets: ["latin", "cyrillic"],
  weight: ["600", "700", "800"],
  variable: "--font-fira",
});
const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-manrope",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#050505",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
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
        {children}
        <Overlays />
      </body>
    </html>
  );
}
