import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Platform Status",
  description: "Real-time MarketHub Pro platform health and incident updates.",
  alternates: { canonical: "https://markethubpromo.com/status" },
};

export default function StatusLayout({ children }: { children: React.ReactNode }) {
  return children;
}
