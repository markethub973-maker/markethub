import Stripe from "stripe";

let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY not set");
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-02-24.acacia" });
  }
  return _stripe;
}

/** @deprecated use getStripe() */
export const stripe = new Proxy({} as Stripe, {
  get(_t, prop) {
    return (getStripe() as any)[prop];
  },
});

export const PLANS = {
  lite: {
    name: "Creator",
    price: "$24/mo",
    priceId: process.env.STRIPE_LITE_PRICE_ID!,
    yearlyPriceId: process.env.STRIPE_LITE_YEARLY_PRICE_ID!,
  },
  pro: {
    name: "Pro",
    price: "$49/mo",
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    yearlyPriceId: process.env.STRIPE_PRO_YEARLY_PRICE_ID!,
  },
  business: {
    name: "Studio",
    price: "$99/mo",
    priceId: process.env.STRIPE_BUSINESS_PRICE_ID!,
    yearlyPriceId: process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID!,
  },
  agency: {
    name: "Agency",
    price: "$249/mo",
    priceId: process.env.STRIPE_AGENCY_PRICE_ID!,
    yearlyPriceId: process.env.STRIPE_AGENCY_YEARLY_PRICE_ID!,
  },
};

export const RESELLER_TIERS = {
  emerging: {
    name: "Emerging Markets",
    price: "€29/mo",
    priceNum: 29,
    currency: "eur",
    priceId: process.env.STRIPE_RESELLER_EMERGING_PRICE_ID!,
    clientCharge: 100,
    clientCurrency: "€",
  },
  southeast: {
    name: "Southeast Europe & LATAM",
    price: "€49/mo",
    priceNum: 49,
    currency: "eur",
    priceId: process.env.STRIPE_RESELLER_RO_PRICE_ID!,
    clientCharge: 200,
    clientCurrency: "€",
  },
  europe: {
    name: "Western Europe & East Asia",
    price: "€99/mo",
    priceNum: 99,
    currency: "eur",
    priceId: process.env.STRIPE_RESELLER_EU_PRICE_ID!,
    clientCharge: 400,
    clientCurrency: "€",
  },
  premium: {
    name: "Premium Markets",
    price: "$149/mo",
    priceNum: 149,
    currency: "usd",
    priceId: process.env.STRIPE_RESELLER_US_PRICE_ID!,
    clientCharge: 500,
    clientCurrency: "$",
  },
  ultra: {
    name: "Ultra-Premium Markets",
    price: "$199/mo",
    priceNum: 199,
    currency: "usd",
    priceId: process.env.STRIPE_RESELLER_ULTRA_PRICE_ID!,
    clientCharge: 800,
    clientCurrency: "$",
  },
} as const;

export type ResellerTierId = keyof typeof RESELLER_TIERS;

/** Map country code → reseller tier */
export const COUNTRY_TO_TIER: Record<string, ResellerTierId> = {
  // Tier 1: Emerging (€29)
  IN: "emerging", PK: "emerging", BD: "emerging", PH: "emerging", VN: "emerging",
  ID: "emerging", TH: "emerging", KH: "emerging", MM: "emerging", LK: "emerging",
  NP: "emerging", NG: "emerging", KE: "emerging", GH: "emerging", ET: "emerging",
  TZ: "emerging", UG: "emerging", SN: "emerging", EG: "emerging", MA: "emerging",
  TN: "emerging", DZ: "emerging", BO: "emerging", PY: "emerging", EC: "emerging",
  GE: "emerging", AM: "emerging", UZ: "emerging", UA: "emerging", MD: "emerging",
  // Tier 2: Southeast Europe & LATAM (€49)
  RO: "southeast", BG: "southeast", RS: "southeast", HR: "southeast", GR: "southeast",
  TR: "southeast", HU: "southeast", BA: "southeast", ME: "southeast", AL: "southeast",
  MK: "southeast", KZ: "southeast", AZ: "southeast", MX: "southeast", BR: "southeast",
  CO: "southeast", AR: "southeast", CL: "southeast", PE: "southeast", CR: "southeast",
  ZA: "southeast", MY: "southeast",
  // Tier 3: Western Europe & East Asia (€99)
  DE: "europe", FR: "europe", IT: "europe", ES: "europe", PT: "europe",
  NL: "europe", BE: "europe", AT: "europe", PL: "europe", CZ: "europe",
  SK: "europe", FI: "europe", SE: "europe", IE: "europe", JP: "europe",
  KR: "europe", TW: "europe", IL: "europe",
  // Tier 4: Premium ($149)
  US: "premium", CA: "premium", GB: "premium", AU: "premium", NZ: "premium",
  DK: "premium", NO: "premium", SG: "premium", HK: "premium",
  // Tier 5: Ultra-Premium ($199)
  CH: "ultra", LU: "ultra", AE: "ultra", QA: "ultra", SA: "ultra",
  KW: "ultra", BH: "ultra", OM: "ultra", MC: "ultra", LI: "ultra",
};
