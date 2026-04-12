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

const jsonLdOrg = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "MarketHub Pro",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: "https://markethubpromo.com",
  description:
    "AI marketing platform for agencies with 16 specialized AI agents, real-time social media analytics, and automated lead generation.",
  offers: [
    { "@type": "Offer", name: "Starter", price: "0", priceCurrency: "USD" },
    { "@type": "Offer", name: "Creator", price: "24", priceCurrency: "USD", billingDuration: "P1M" },
    { "@type": "Offer", name: "Pro", price: "49", priceCurrency: "USD", billingDuration: "P1M" },
    { "@type": "Offer", name: "Studio", price: "99", priceCurrency: "USD", billingDuration: "P1M" },
    { "@type": "Offer", name: "Agency", price: "249", priceCurrency: "USD", billingDuration: "P1M" },
  ],
  aggregateRating: { "@type": "AggregateRating", ratingValue: "4.9", reviewCount: "87" },
};

const jsonLdFaq = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is MarketHub Pro?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "MarketHub Pro is an AI-powered marketing platform for agencies and content creators. It combines real-time analytics for YouTube, Instagram, TikTok and Facebook with 16 specialized AI agents that help you find clients, write copy, optimize SEO, run ads and grow organically.",
      },
    },
    {
      "@type": "Question",
      name: "How does the AI Lead Finder work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You describe your offer and target market. The AI searches across 8 platforms simultaneously (Google, OLX, Instagram, TikTok, Facebook Groups, Reddit, YouTube, Google Maps), scores each lead by fit, writes personalized outreach messages in your language, and delivers ready-to-send campaigns.",
      },
    },
    {
      "@type": "Question",
      name: "What AI models power the platform?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Creator plan uses AI MarketHub Engine Standard tier (fast and efficient). Pro, Studio and Agency plans use AI MarketHub Engine Premium tier — delivering higher quality outputs on all 16 AI agents.",
      },
    },
    {
      "@type": "Question",
      name: "Can I try it for free?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. The Starter plan includes 14 days free with 5 Premium AI Actions per month, access to Research Hub, Lead Database, and all analytics dashboards. No credit card required to start.",
      },
    },
    {
      "@type": "Question",
      name: "Which social platforms does MarketHub Pro support?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "YouTube, Instagram, TikTok, Facebook, plus local market sources including OLX and regional classifieds, directories and real estate platforms depending on target market.",
      },
    },
    {
      "@type": "Question",
      name: "Is the platform available in multiple languages?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. All 16 AI agents support 20+ languages including English, French, German, Spanish, Italian, Greek, Portuguese, Polish, Hungarian, Japanese, Korean, Arabic and more.",
      },
    },
  ],
};

export default function PromoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrg) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />
      {children}
    </>
  );
}
