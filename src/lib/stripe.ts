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
  starter: {
    name: "Starter",
    price: "$9/mo",
    priceId: process.env.STRIPE_STARTER_PRICE_ID!,
  },
  lite: {
    name: "Lite",
    price: "$19/mo",
    priceId: process.env.STRIPE_LITE_PRICE_ID!,
  },
  pro: {
    name: "Pro",
    price: "$39/mo",
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
  },
  business: {
    name: "Business",
    price: "$99/mo",
    priceId: process.env.STRIPE_BUSINESS_PRICE_ID!,
  },
  enterprise: {
    name: "Enterprise",
    price: "$249/mo",
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID!,
  },
};
