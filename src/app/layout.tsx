import type { Metadata } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthGuard from "@/components/auth/AuthGuard";
import ReportIssueButton from "@/components/ui/ReportIssueButton";
import AskConsultant from "@/components/ui/AskConsultant";

const inter = Inter({ subsets: ["latin"] });

// Microsoft Clarity project ID — session replay + heatmaps (free, unlimited)
// Used together with Sentry Replay: Clarity = all sessions, Sentry = error sessions.
const CLARITY_PROJECT_ID = "wb3kzgygye";

const SITE_URL = "https://markethubpromo.com";
const OG_IMAGE = `${SITE_URL}/og-image.png`; // 1200x630 — drop into /public

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "MarketHub Pro — Social Media Marketing Platform for Agencies",
    template: "%s · MarketHub Pro",
  },
  description:
    "All-in-one social media marketing platform: cross-platform analytics, content calendar with auto-publish, CRM + lead finder, AI agents, automation engine. For creators and agencies.",
  keywords: [
    "social media management",
    "social media marketing",
    "Instagram analytics",
    "TikTok analytics",
    "YouTube analytics",
    "LinkedIn analytics",
    "content calendar",
    "automation",
    "CRM for agencies",
    "marketing automation",
    "AI marketing assistant",
    "white-label social media",
  ],
  authors: [{ name: "MarketHub Pro" }],
  creator: "MarketHub Pro",
  publisher: "MarketHub Pro",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "MarketHub Pro",
    title: "MarketHub Pro — Social Media Marketing Platform for Agencies",
    description:
      "Cross-platform analytics, calendar with auto-publish, CRM, AI agents, and a 31-template automation engine — in one app.",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "MarketHub Pro — Social Media Marketing Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MarketHub Pro — Social Media Marketing Platform",
    description:
      "Cross-platform analytics, calendar with auto-publish, CRM, AI agents, and 31 ready automations.",
    images: [OG_IMAGE],
    creator: "@markethubpro",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  alternates: {
    canonical: SITE_URL,
  },
  category: "marketing",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Microsoft Clarity — loads after page interactive so it never blocks rendering. */}
        <Script id="ms-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");
          `}
        </Script>
        <AuthGuard>{children}</AuthGuard>
        {/* M4 Sprint 1 — floating help button visible on every page */}
        <ReportIssueButton />
        {/* M9 Sprint 1 — floating AI consultant (bottom-left) */}
        <AskConsultant />
      </body>
    </html>
  );
}
