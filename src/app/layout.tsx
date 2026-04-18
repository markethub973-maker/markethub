import type { Metadata } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthGuard from "@/components/auth/AuthGuard";
import AskConsultant from "@/components/ui/AskConsultant";
import CookieConsent from "@/components/ui/CookieConsent";
import { ThemeProvider } from "@/components/ThemeProvider";
// ThemeSwitcher moved to Sidebar — no longer floating
import { ThemeProvider as LiquidGlassThemeProvider } from "@/context/ThemeContext";
// ThemeCustomizer removed — using ThemeSwitcher (the original) instead
import CommandPalette from "@/components/ui/CommandPalette";
import ToastContainer from "@/components/ui/ToastContainer";

const inter = Inter({ subsets: ["latin"], display: "swap" });

// Microsoft Clarity project ID — session replay + heatmaps (free, unlimited)
// Used together with Sentry Replay: Clarity = all sessions, Sentry = error sessions.
const CLARITY_PROJECT_ID = "wb3kzgygye";

const SITE_URL = "https://markethubpromo.com";
// Generated dynamically by src/app/opengraph-image.tsx at request time.
// No need to drop a static PNG anywhere.
const OG_IMAGE = `${SITE_URL}/opengraph-image`;

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

// Inline anti-flash theme script — runs BEFORE React hydration so the
// saved theme + custom-color overrides apply instantly and the user
// never sees a flash of the default theme.
const themeInitScript = `
  (function() {
    try {
      var saved = localStorage.getItem('markethub-theme') || 'amber';
      document.documentElement.setAttribute('data-theme', saved);
      if (saved === 'custom') {
        var raw = localStorage.getItem('markethub-custom-colors');
        if (raw) {
          var c = JSON.parse(raw);
          var hex = /^#[0-9A-Fa-f]{6}$/;
          if (c.primary && c.accent && hex.test(c.primary) && hex.test(c.accent)) {
            function toRgb(h){return{r:parseInt(h.slice(1,3),16),g:parseInt(h.slice(3,5),16),b:parseInt(h.slice(5,7),16)};}
            function rgba(h,a){var r=toRgb(h);return 'rgba('+r.r+','+r.g+','+r.b+','+a+')';}
            function dk(h,p){var r=toRgb(h),f=1-p/100,h2=function(n){return Math.max(0,Math.min(255,Math.round(n*f))).toString(16).padStart(2,'0');};return '#'+h2(r.r)+h2(r.g)+h2(r.b);}
            var s = document.documentElement.style;
            s.setProperty('--color-primary', c.primary);
            s.setProperty('--color-primary-hover', dk(c.primary, 12));
            s.setProperty('--color-primary-light', rgba(c.primary, 0.10));
            s.setProperty('--color-primary-dark', dk(c.primary, 35));
            s.setProperty('--color-accent', c.accent);
            s.setProperty('--color-accent-hover', dk(c.accent, 12));
            s.setProperty('--color-accent-light', rgba(c.accent, 0.10));
            s.setProperty('--color-accent-dark', dk(c.accent, 35));
            if (c.bg && hex.test(c.bg)) s.setProperty('--color-bg', c.bg);
            if (c.surface && hex.test(c.surface)) {
              s.setProperty('--color-bg-secondary', c.surface);
              s.setProperty('--color-bg-tertiary', dk(c.surface, 5));
            }
            s.setProperty('--color-border', rgba(c.primary, 0.15));
            s.setProperty('--color-border-hover', rgba(c.primary, 0.30));
          }
        }
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="amber" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={inter.className}>
        {/* Liquid Glass SVG Filter — referenced by .liquidGlass-effect via url(#glass-distortion) */}
        <svg style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} aria-hidden="true">
          <defs>
            <filter id="glass-distortion" x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence type="fractalNoise" baseFrequency="0.012 0.012" numOctaves={2} seed={42} result="noise" />
              <feGaussianBlur in="noise" stdDeviation={2} result="blurred" />
              <feComponentTransfer in="blurred" result="mapped">
                <feFuncR type="gamma" amplitude={1} exponent={8} offset={0.48} />
                <feFuncG type="gamma" amplitude={1} exponent={8} offset={0.48} />
              </feComponentTransfer>
              <feDisplacementMap in="SourceGraphic" in2="mapped" scale={16} xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
        </svg>
        {/* Microsoft Clarity — loads after page interactive AND only if the
           user has accepted analytics cookies (window.__mkh_consent === "all").
           See CookieConsent component. Listens for the "mkh:consent-accepted"
           event so accepting AFTER page load also triggers loading. */}
        <Script id="ms-clarity" strategy="afterInteractive">
          {`
            (function(){
              function loadClarity(){
                if (window.__mkh_loaded_clarity) return;
                window.__mkh_loaded_clarity = true;
                (function(c,l,a,r,i,t,y){
                  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                })(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");
              }
              if (window.__mkh_consent === "all") {
                loadClarity();
              } else {
                window.addEventListener("mkh:consent-accepted", loadClarity, { once: true });
              }
            })();
          `}
        </Script>
        <LiquidGlassThemeProvider>
          <ThemeProvider>
            <AuthGuard>{children}</AuthGuard>
            {/* Theme Customize button (original, top-right) */}
            {/* ThemeSwitcher moved to Sidebar */}
            {/* M9 Sprint 1 — floating AI consultant (bottom-left) */}
            <AskConsultant />
            {/* GDPR cookie consent banner — gates analytics loading */}
            <CookieConsent />
          </ThemeProvider>
          {/* Liquid Glass theme customizer — bottom-right floating palette button */}
          {/* ThemeCustomizer removed — ThemeSwitcher handles themes */}
          {/* CMD+K Command Palette — keyboard-triggered global navigation */}
          <CommandPalette />
          {/* Glass Toast Notifications — bottom-right stacked */}
          <ToastContainer />
        </LiquidGlassThemeProvider>
      </body>
    </html>
  );
}
