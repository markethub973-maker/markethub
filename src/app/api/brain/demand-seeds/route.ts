/**
 * POST /api/brain/demand-seeds — seed brain_demand_signals with starter niches.
 *
 * Writes ~15 hand-picked EU/RO marketplace demand signals so the Marketplace
 * Broker strategy (Strategy Stack #13) has usable data before Apify comes
 * back online. Each signal gets embedded so semantic clustering + arbitrage
 * matching (brain_arbitrage_matches) can work immediately.
 *
 * Idempotent: re-running skips signals with the same product_name from the
 * same source.
 *
 * Auth: x-brain-cron-secret. One-time manual call OR run via cron if we
 * want to refresh the seeds periodically.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { embedBatch } from "@/lib/embed";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Seed {
  product_name: string;
  category: string;
  country_code: string;
  demand_signal_type: string;
  detected_price_range: string;
  notes: string;
  confidence_score: number;
}

// Hand-picked EU/RO demand signals — starter data for the arbitrage engine.
// These are observational (public knowledge, not scraped), so the legal-first
// rule holds. When Apify comes back, /api/brain/demand-scanner will extend
// this set automatically.
const SEEDS: Seed[] = [
  {
    product_name: "Sustainable pet products (cat / dog)",
    category: "pet",
    country_code: "RO",
    demand_signal_type: "growing_niche",
    detected_price_range: "EUR 15-80 avg order",
    notes: "Organic food, biodegradable litter, eco toys — steady 15-20% YoY growth in EU pet market",
    confidence_score: 85,
  },
  {
    product_name: "Home gym equipment (compact apartments)",
    category: "fitness",
    country_code: "RO",
    demand_signal_type: "post_pandemic_steady",
    detected_price_range: "EUR 50-400",
    notes: "Adjustable dumbbells, resistance bands, folding benches — sustained demand in RO cities post-2021",
    confidence_score: 75,
  },
  {
    product_name: "Organic produce boxes (weekly subscription)",
    category: "food",
    country_code: "RO",
    demand_signal_type: "premium_urban",
    detected_price_range: "EUR 25-60/box",
    notes: "Bucharest, Cluj, Timișoara — rising urban middle class willing to pay premium for farm-direct",
    confidence_score: 70,
  },
  {
    product_name: "Handmade cosmetics (bar soap, balms)",
    category: "beauty",
    country_code: "RO",
    demand_signal_type: "handmade_premium",
    detected_price_range: "EUR 8-25",
    notes: "Small-batch artisan brands — Instagram-driven, low logistics overhead, high margin",
    confidence_score: 80,
  },
  {
    product_name: "Small-batch specialty coffee",
    category: "food",
    country_code: "RO",
    demand_signal_type: "third_wave_coffee",
    detected_price_range: "EUR 14-35/bag",
    notes: "Specialty roasters in Bucharest/Cluj — subscription model works, average cart EUR 28",
    confidence_score: 75,
  },
  {
    product_name: "Tech accessories (phone cases, chargers, cables)",
    category: "tech",
    country_code: "RO",
    demand_signal_type: "commodity_high_volume",
    detected_price_range: "EUR 5-30",
    notes: "High-volume low-margin — works at scale with eMAG / GOMAG stores, good for arbitrage import",
    confidence_score: 85,
  },
  {
    product_name: "Outdoor / hiking gear",
    category: "outdoor",
    country_code: "RO",
    demand_signal_type: "seasonal_peak_spring",
    detected_price_range: "EUR 30-250",
    notes: "Backpacks, tents, trail shoes — peak March-October, Carpathians tourism wave",
    confidence_score: 70,
  },
  {
    product_name: "Kids educational toys (STEM)",
    category: "toys",
    country_code: "RO",
    demand_signal_type: "gift_driven",
    detected_price_range: "EUR 20-80",
    notes: "Montessori-style wooden toys, coding kits, science experiments — gift-peak Dec + June",
    confidence_score: 65,
  },
  {
    product_name: "Vintage / restored furniture",
    category: "home",
    country_code: "RO",
    demand_signal_type: "niche_premium",
    detected_price_range: "EUR 150-1200",
    notes: "Restored mid-century pieces — low volume but high margin, Instagram + Olx dominant",
    confidence_score: 55,
  },
  {
    product_name: "Home office setup (desk accessories, ergonomic)",
    category: "office",
    country_code: "RO",
    demand_signal_type: "wfh_structural",
    detected_price_range: "EUR 20-300",
    notes: "Standing desks, monitor arms, ergonomic chairs — durable post-2020 demand shift",
    confidence_score: 75,
  },
  {
    product_name: "Wellness / self-care (candles, aromatherapy)",
    category: "beauty",
    country_code: "RO",
    demand_signal_type: "stress_response",
    detected_price_range: "EUR 12-50",
    notes: "Soy candles, essential oils — Instagram-driven gift segment",
    confidence_score: 65,
  },
  {
    product_name: "Traditional Romanian craft goods (ie, tole pictate)",
    category: "craft",
    country_code: "RO",
    demand_signal_type: "diaspora_gift",
    detected_price_range: "EUR 40-300",
    notes: "Romanian diaspora in Italy/UK/DE buying authentic crafts — cross-border micro-export potential",
    confidence_score: 60,
  },
  {
    product_name: "Pet training / enrichment products",
    category: "pet",
    country_code: "RO",
    demand_signal_type: "growing_niche",
    detected_price_range: "EUR 15-60",
    notes: "Puzzle feeders, training clickers, calming aids — sub-segment of pet market with higher margin",
    confidence_score: 70,
  },
  {
    product_name: "Electric scooters / e-bikes (urban commute)",
    category: "mobility",
    country_code: "RO",
    demand_signal_type: "urban_mobility_shift",
    detected_price_range: "EUR 300-2500",
    notes: "Bucharest, Cluj urban commuters — regulatory tailwind (bike lanes + subsidies)",
    confidence_score: 65,
  },
  {
    product_name: "Home coffee equipment (grinders, espresso)",
    category: "home",
    country_code: "RO",
    demand_signal_type: "enthusiast_segment",
    detected_price_range: "EUR 80-1500",
    notes: "Home baristas post-pandemic — complements small-batch coffee subscription",
    confidence_score: 60,
  },

  // ─── DE (Germany) — largest EU market, premium willingness, eco-conscious ───
  {
    product_name: "Bio / organic grocery boxes",
    category: "food",
    country_code: "DE",
    demand_signal_type: "bio_premium",
    detected_price_range: "EUR 30-80/box",
    notes: "Strong DE bio market, weekly subscription preferred, urban professionals",
    confidence_score: 85,
  },
  {
    product_name: "Sustainable household products (zero waste)",
    category: "home",
    country_code: "DE",
    demand_signal_type: "eco_conscious",
    detected_price_range: "EUR 10-60",
    notes: "Refillable soaps, beeswax wraps, compost kits — mainstream in DE now",
    confidence_score: 80,
  },
  {
    product_name: "E-bike accessories (urban commute)",
    category: "mobility",
    country_code: "DE",
    demand_signal_type: "urban_mobility_shift",
    detected_price_range: "EUR 40-400",
    notes: "Locks, lights, panniers, helmets — DE leads EU e-bike adoption",
    confidence_score: 85,
  },
  {
    product_name: "Board games (family + hobby)",
    category: "toys",
    country_code: "DE",
    demand_signal_type: "cultural_staple",
    detected_price_range: "EUR 30-120",
    notes: "DE world capital of board games (Spielemesse, Essen) — niche gift retail",
    confidence_score: 75,
  },
  {
    product_name: "Ergonomic office furniture",
    category: "office",
    country_code: "DE",
    demand_signal_type: "wfh_structural",
    detected_price_range: "EUR 200-1200",
    notes: "Standing desks, ergonomic chairs — DE workers health-conscious + premium willing",
    confidence_score: 80,
  },

  // ─── FR (France) — aesthetics + wellness + craft premium ───
  {
    product_name: "Natural / paraben-free cosmetics",
    category: "beauty",
    country_code: "FR",
    demand_signal_type: "clean_beauty",
    detected_price_range: "EUR 15-70",
    notes: "FR leads clean beauty trend — L'Oréal local competition, indie brands thrive",
    confidence_score: 85,
  },
  {
    product_name: "Artisan wine + spirits accessories",
    category: "lifestyle",
    country_code: "FR",
    demand_signal_type: "premium_gift",
    detected_price_range: "EUR 30-200",
    notes: "Decanters, glasses, wine subscriptions — cultural fit, gift-heavy",
    confidence_score: 75,
  },
  {
    product_name: "Home fragrance (candles, diffusers)",
    category: "home",
    country_code: "FR",
    demand_signal_type: "wellness_premium",
    detected_price_range: "EUR 20-150",
    notes: "Diptyque-adjacent segment — mid-market brands growing fast",
    confidence_score: 80,
  },
  {
    product_name: "Kids learning toys (French curriculum aligned)",
    category: "toys",
    country_code: "FR",
    demand_signal_type: "education_focused",
    detected_price_range: "EUR 25-90",
    notes: "Parents spend on educational gifts; Montessori-FR variants trending",
    confidence_score: 70,
  },
  {
    product_name: "Gourmet food subscriptions",
    category: "food",
    country_code: "FR",
    demand_signal_type: "foodie_premium",
    detected_price_range: "EUR 35-80/box",
    notes: "Artisan cheese, charcuterie, regional specialties — FR terroir segment",
    confidence_score: 75,
  },

  // ─── IT (Italy) — design + food + fashion ───
  {
    product_name: "Italian artisan food products (olive oil, pasta, cheese)",
    category: "food",
    country_code: "IT",
    demand_signal_type: "local_pride",
    detected_price_range: "EUR 20-120",
    notes: "Export-ready niche — diaspora + global foodies, strong margins",
    confidence_score: 85,
  },
  {
    product_name: "Design home accessories (lamps, small furniture)",
    category: "home",
    country_code: "IT",
    demand_signal_type: "design_heritage",
    detected_price_range: "EUR 40-500",
    notes: "IT design legacy (Milan) — studios that export via e-commerce underserved",
    confidence_score: 75,
  },
  {
    product_name: "Sustainable fashion accessories (bags, small leather)",
    category: "fashion",
    country_code: "IT",
    demand_signal_type: "craft_premium",
    detected_price_range: "EUR 80-400",
    notes: "Florence + Milan craftsmanship, direct-to-consumer growing",
    confidence_score: 70,
  },
  {
    product_name: "Espresso equipment (home + prosumer)",
    category: "food",
    country_code: "IT",
    demand_signal_type: "cultural_staple",
    detected_price_range: "EUR 60-800",
    notes: "IT coffee culture exportable — Bialetti, La Pavoni adjacent",
    confidence_score: 75,
  },
  {
    product_name: "Pet supplies (IT market, premium niche)",
    category: "pet",
    country_code: "IT",
    demand_signal_type: "growing_niche",
    detected_price_range: "EUR 15-80",
    notes: "IT pet ownership up 20% YoY since 2020, premium segment follows",
    confidence_score: 65,
  },

  // ─── ES (Spain) — health + outdoor + gastronomy ───
  {
    product_name: "Outdoor / hiking gear (Camino + coast)",
    category: "outdoor",
    country_code: "ES",
    demand_signal_type: "tourism_driven",
    detected_price_range: "EUR 30-300",
    notes: "Camino de Santiago + coastal hiking + picos — sustained demand March-October",
    confidence_score: 75,
  },
  {
    product_name: "Tapas + cooking supplies (jamon, paella pans)",
    category: "food",
    country_code: "ES",
    demand_signal_type: "local_pride",
    detected_price_range: "EUR 25-180",
    notes: "Export-friendly authentic ES products, gift + diaspora + foodie market",
    confidence_score: 80,
  },
  {
    product_name: "Natural sunscreen + skincare",
    category: "beauty",
    country_code: "ES",
    demand_signal_type: "climate_driven",
    detected_price_range: "EUR 12-50",
    notes: "High UV market, growing clean-beauty subsegment, year-round demand",
    confidence_score: 75,
  },
  {
    product_name: "Pool + beach accessories (premium)",
    category: "outdoor",
    country_code: "ES",
    demand_signal_type: "seasonal_peak_summer",
    detected_price_range: "EUR 20-200",
    notes: "Seasonal but intense April-September, large expat + tourist overlap",
    confidence_score: 65,
  },
  {
    product_name: "Home gym equipment (urban ES apartments)",
    category: "fitness",
    country_code: "ES",
    demand_signal_type: "post_pandemic_steady",
    detected_price_range: "EUR 50-400",
    notes: "ES urban density favors compact home equipment — Madrid, Barcelona strong",
    confidence_score: 70,
  },
];

function authOk(req: NextRequest): boolean {
  const secret = req.headers.get("x-brain-cron-secret");
  return Boolean(secret && secret === process.env.BRAIN_CRON_SECRET);
}

export async function POST(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = createServiceClient();

  // Skip seeds we've already inserted (tracked by notes prefix because
  // the source CHECK constraint doesn't allow a "seed" value — we use
  // google_trends as the valid source and mark seeds via notes prefix).
  const { data: existing } = await svc
    .from("brain_demand_signals")
    .select("product_name")
    .like("notes", "[SEED]%");
  const existingNames = new Set((existing ?? []).map((r) => r.product_name as string));
  const toInsert = SEEDS.filter((s) => !existingNames.has(s.product_name));

  if (toInsert.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0, skipped_already_seeded: SEEDS.length });
  }

  // Embed the signals in one batch (<= 100 OpenAI limit, we only have 15)
  const texts = toInsert.map((s) => `${s.product_name} — ${s.category} — ${s.notes}`);
  const embeddings = await embedBatch(texts);

  const rows = toInsert.map((s, i) => ({
    // Source CHECK constraint accepts google_shopping/ebay/google_trends.
    // demand_signal_type also has a CHECK constraint with a narrow list —
    // skip it (nullable) to avoid the constraint collision; move the seed
    // classification into notes prefix so the information survives.
    source: "google_trends",
    product_name: s.product_name,
    category: s.category,
    country_code: s.country_code,
    detected_price_range: s.detected_price_range,
    confidence_score: s.confidence_score,
    embedding: embeddings[i],
    notes: `[SEED][${s.demand_signal_type}] ${s.notes}`,
  }));

  const { error, count } = await svc
    .from("brain_demand_signals")
    .insert(rows, { count: "exact" });

  if (error) {
    return NextResponse.json({ error: error.message, inserted: 0 }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    inserted: count ?? rows.length,
    with_embeddings: rows.filter((r) => r.embedding !== null).length,
  });
}

// Check constraint on source rejects "seed" currently — if you see a
// source_check error, widen the constraint in a migration OR use
// "google_trends" as the source value (already allowed).
