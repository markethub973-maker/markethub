import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Start your free trial",
  description:
    "Create a MarketHub Pro account in 30 seconds. 14-day free trial, no credit card required.",
  alternates: { canonical: "https://markethubpromo.com/register" },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
