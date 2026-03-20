import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-01-27.acacia",
});

export const PLANS = {
  pro: {
    name: "Pro",
    price: "$29/luna",
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
  },
  enterprise: {
    name: "Enterprise",
    price: "$99/luna",
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID!,
  },
};
