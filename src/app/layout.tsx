import type { Metadata } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthGuard from "@/components/auth/AuthGuard";
import ReportIssueButton from "@/components/ui/ReportIssueButton";

const inter = Inter({ subsets: ["latin"] });

// Microsoft Clarity project ID — session replay + heatmaps (free, unlimited)
// Used together with Sentry Replay: Clarity = all sessions, Sentry = error sessions.
const CLARITY_PROJECT_ID = "wb3kzgygye";

export const metadata: Metadata = {
  title: "MarketHub Pro — Social Video Intelligence",
  description: "Cross-platform social video analytics for YouTube, TikTok, Instagram and Facebook",
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
      </body>
    </html>
  );
}
