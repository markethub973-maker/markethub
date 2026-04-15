import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Marketing Accelerator — 30 días de contenido, entregado en 5 días",
  description:
    "60 captions + 20 imágenes IA + calendario 30 días + 50 leads cualificados. Precio fundador €900 (primeros 10 clientes). Entrega 5–7 días.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "AI Marketing Accelerator — Cliente Fundador",
    description: "30 días de marketing, entregados en 5 días. €900.",
    type: "website",
  },
};

export default function OfferEsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
