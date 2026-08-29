import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { I18nProvider } from "@/components/i18n-provider";
import { getLocale } from "@/lib/i18n/server";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Suay.store — Find a Clinic You Can Trust",
    template: "%s · Suay.store",
  },
  description:
    "Discover verified clinics and professionals, understand your treatment options, and book with confidence.",
  applicationName: "Suay.store",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#163A4A",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={inter.variable} data-scroll-behavior="smooth">
      <body className="min-h-dvh antialiased">
        {/* First stop for keyboard and screen-reader users on every page. */}
        <a
          href="#main"
          className="sr-only-focusable absolute left-4 top-4 z-50 rounded-md border border-line bg-surface px-3 py-2 text-sm font-medium text-navy-600 shadow-[var(--shadow-raised)]"
        >
          Skip to main content
        </a>
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
