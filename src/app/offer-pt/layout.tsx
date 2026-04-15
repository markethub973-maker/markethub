import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Marketing Accelerator — 30 dias de conteúdo, entregues em 5 dias",
  description:
    "60 legendas + 20 imagens IA + calendário 30 dias + 50 leads qualificados. Preço fundador €700 (primeiros 10 clientes). Entrega 5–7 dias.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "AI Marketing Accelerator — Cliente Fundador",
    description: "30 dias de marketing, entregues em 5 dias. €700.",
    type: "website",
  },
};

export default function OfferPtLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
