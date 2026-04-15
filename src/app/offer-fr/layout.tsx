import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Marketing Accelerator — 30 jours de contenu, livré en 5 jours",
  description:
    "60 légendes + 20 images IA + calendrier 30 jours + 50 prospects qualifiés. Tarif fondateur €1200 (10 premiers clients). Livraison 5–7 jours.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "AI Marketing Accelerator — Client Fondateur",
    description: "30 jours de marketing, livrés en 5 jours. €1200.",
    type: "website",
  },
};

export default function OfferFrLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
