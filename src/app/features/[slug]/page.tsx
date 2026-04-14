import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FeatureLanding from "@/components/features/FeatureLanding";
import { FEATURES, getFeature } from "@/lib/featuresData";

// Pre-render every feature page at build time
export function generateStaticParams() {
  return FEATURES.map((f) => ({ slug: f.slug }));
}

interface Params { slug: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const f = getFeature(slug);
  if (!f) return { title: "Feature not found" };
  return {
    title: `${f.title} — MarketHub Pro`,
    description: f.tagline,
    keywords: f.seo_keywords,
    openGraph: {
      title: f.hero_h1,
      description: f.tagline,
      type: "website",
    },
  };
}

export default async function FeaturePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const feature = getFeature(slug);
  if (!feature) notFound();
  return <FeatureLanding feature={feature} />;
}
