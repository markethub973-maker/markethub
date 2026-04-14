import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Marketing Accelerator — 30 days of content, delivered in 5 days",
  description:
    "60 captions + 20 AI images + 30-day calendar + 50 qualified leads. Founding-client price €1000 (first 10 clients). 5-7 day delivery.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "AI Marketing Accelerator — Founding Client",
    description: "30 days of marketing, delivered in 5 days. €1000.",
    type: "website",
  },
};

// Standalone layout — no sidebar, no auth widgets, no app chrome.
export default function OfferIntlLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
