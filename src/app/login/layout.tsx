import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to MarketHub Pro.",
  robots: { index: false, follow: false },
  alternates: { canonical: "https://markethubpromo.com/login" },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
