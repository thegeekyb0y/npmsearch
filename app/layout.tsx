import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { GlobalShortcuts } from "./components/global-shortcuts";
import { LinkPreview } from "./components/link-preview";
import { MotionProvider } from "./components/motion-provider";
import { SiteFooter } from "./components/site-footer";
import { SiteHeader } from "./components/site-header";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
} from "./lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "npmsearch",
    template: "%s | npmsearch",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "npmsearch — the npm registry without the noise",
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "npmsearch — a fast, keyboard-first npm registry explorer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "npmsearch — the npm registry without the noise",
    description: SITE_DESCRIPTION,
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-4 focus:z-50 focus:rounded-[var(--radius-sm)] focus:border focus:border-brand focus:bg-surface focus:px-3 focus:py-2 focus:text-[13px] focus:text-text-primary"
        >
          Skip to content
        </a>
        <MotionProvider>
          <SiteHeader />
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
          <SiteFooter />
          <LinkPreview />
        </MotionProvider>
        <GlobalShortcuts />
        <Analytics />
      </body>
    </html>
  );
}
