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
