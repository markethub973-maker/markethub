import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "White-Label Content Engine for Agencies | MarketHub Pro",
  description:
    "Deliver 10x more content to every client without hiring staff. AI-generated captions, images, and automated scheduling — all branded as your agency.",
  keywords: [
    "white label content engine",
    "agency content automation",
    "white label marketing platform",
    "AI content generation agencies",
    "automated social media posting",
    "white label dashboard",
    "marketing agency software",
  ],
  authors: [{ name: "MarketHub Pro", url: "https://markethubpromo.com" }],
  creator: "MarketHub Pro",
  metadataBase: new URL("https://markethubpromo.com"),
  alternates: { canonical: "/white-label" },
  openGraph: {
    type: "website",
    url: "https://markethubpromo.com/white-label",
    title: "White-Label Content Engine for Agencies | MarketHub Pro",
    description:
      "AI content engine branded as yours. 60 captions + 20 images per client per month with automated scheduling. Start with a free 5-client pilot.",
    siteName: "MarketHub Pro",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "MarketHub Pro White-Label Content Engine",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "White-Label Content Engine for Agencies | MarketHub Pro",
    description:
      "AI content engine branded as yours. 60 captions + 20 images per client per month. Start with a free 5-client pilot.",
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

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "MarketHub Pro White-Label Content Engine",
  description:
    "AI-powered white-label content engine for digital marketing agencies. Automated captions, images, and scheduling branded under your agency.",
  url: "https://markethubpromo.com/white-label",
  brand: { "@type": "Brand", name: "MarketHub Pro" },
  offers: [
    { "@type": "Offer", name: "Starter", price: "299", priceCurrency: "EUR", billingDuration: "P1M", description: "Up to 5 clients" },
    { "@type": "Offer", name: "Growth", price: "599", priceCurrency: "EUR", billingDuration: "P1M", description: "Up to 15 clients" },
    { "@type": "Offer", name: "Scale", price: "999", priceCurrency: "EUR", billingDuration: "P1M", description: "Unlimited clients" },
  ],
};

export default function WhiteLabelLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
