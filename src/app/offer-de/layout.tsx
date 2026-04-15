import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Marketing Accelerator — 30 Tage Content, in 5 Tagen geliefert",
  description:
    "60 Captions + 20 KI-Bilder + 30-Tage-Kalender + 50 qualifizierte Leads. Gründerpreis €1500 (erste 10 Kunden). 5–7 Tage Lieferung.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "AI Marketing Accelerator — Gründerpreis",
    description: "30 Tage Marketing, in 5 Tagen geliefert. €1500.",
    type: "website",
  },
};

export default function OfferDeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
