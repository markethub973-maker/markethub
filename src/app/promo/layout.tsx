import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MarketHub Pro — AI Marketing Platform for Agencies | Find Clients & Grow Faster",
  viewport: "width=device-width, initial-scale=1, maximum-scale=5",
  description:
    "MarketHub Pro gives marketing agencies 16 specialized AI agents, real-time analytics for YouTube, Instagram, TikTok & Facebook, and an AI Lead Finder that delivers 50+ qualified leads per week. Start free.",
  keywords: [
    "AI marketing platform",
    "marketing agency software",
    "social media analytics",
    "AI lead generation",
    "YouTube analytics dashboard",
    "Instagram analytics",
    "TikTok analytics",
    "marketing automation",
    "AI agents for marketing",
    "lead finder tool",
  ],
  authors: [{ name: "MarketHub Pro", url: "https://markethubpromo.com" }],
  creator: "MarketHub Pro",
  metadataBase: new URL("https://markethubpromo.com"),
  alternates: { canonical: "/promo" },
  openGraph: {
    type: "website",
    url: "https://markethubpromo.com/promo",
    title: "MarketHub Pro — AI Marketing Platform for Agencies",
    description:
      "16 AI agents + real-time analytics for YouTube, Instagram, TikTok & Facebook. Find 50+ qualified leads per week. Start free.",
    siteName: "MarketHub Pro",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "MarketHub Pro — AI Marketing Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MarketHub Pro — AI Marketing Platform for Agencies",
    description:
      "16 AI agents + real-time analytics for YouTube, Instagram, TikTok & Facebook. Find 50+ qualified leads per week.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function PromoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
