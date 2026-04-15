import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Marketing Accelerator — 30 giorni di contenuti, consegnati in 5 giorni",
  description:
    "60 caption + 20 immagini IA + calendario 30 giorni + 50 lead qualificati. Prezzo fondatore €900 (primi 10 clienti). Consegna 5–7 giorni.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "AI Marketing Accelerator — Cliente Fondatore",
    description: "30 giorni di marketing, consegnati in 5 giorni. €900.",
    type: "website",
  },
};

export default function OfferItLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
