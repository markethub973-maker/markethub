import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Marketing Accelerator — 30 zile de conținut, livrate în 5 zile",
  description:
    "60 postări + 20 imagini AI + calendar 30 zile + 50 lead-uri calificate. Preț de lansare €499 (primii 10 clienți). Livrare în 5-7 zile.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "AI Marketing Accelerator — Founding Client",
    description: "30 zile de marketing, livrate în 5 zile. €499.",
    type: "website",
  },
};

// Standalone layout — no sidebar, no auth widgets, no app chrome.
// This is a customer-facing marketing page, kept cleanly isolated from
// the in-app UI so prospects see a pure sales experience.
export default function OfferROLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
