import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "MarketHub Pro plans: Creator $24/mo, Pro $49/mo, Studio $99/mo, Agency $249/mo. 14-day free trial, cancel anytime.",
  alternates: { canonical: "https://markethubpromo.com/pricing" },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
