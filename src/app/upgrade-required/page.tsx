"use client";

import { Zap, Check } from "lucide-react";
import Link from "next/link";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "$9",
    period: "/month",
    highlight: false,
    features: ["10,000 AI tokens/month", "3 YouTube channels", "30 AI captions/month", "30-day history"],
  },
  {
    id: "lite",
    name: "Lite",
    price: "$19",
    period: "/month",
    highlight: true,
    features: ["50,000 AI tokens/month", "10 channels", "150 AI captions/month", "TikTok access", "90-day history"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$39",
    period: "/month",
    highlight: false,
    features: ["150,000 AI tokens/month", "25 channels", "500 AI captions/month", "3 Instagram accounts", "365-day history", "Priority support"],
  },
];

export default function UpgradeRequiredPage() {
  return (
    <div className="min-h-screen bg-[#FFF8F0] flex flex-col items-center justify-center px-4 py-16">
      {/* Logo */}
      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 mb-6">
        <span className="text-white text-xl font-bold">M</span>
      </div>

      <h1 className="text-2xl font-bold text-stone-800 mb-2 text-center">
        Your free trial has ended
      </h1>
      <p className="text-stone-500 text-center max-w-md mb-10">
        Choose a plan to continue using AI analytics, competitor tracking, and all platform features.
      </p>

      {/* Plans */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl mb-10">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`rounded-2xl border p-6 flex flex-col gap-4 ${
              plan.highlight
                ? "border-amber-400 bg-white shadow-lg shadow-amber-100"
                : "border-stone-200 bg-white"
            }`}
          >
            {plan.highlight && (
              <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-3 py-0.5 self-start">
                Most popular
              </span>
            )}
            <div>
              <p className="font-bold text-stone-800 text-lg">{plan.name}</p>
              <p className="text-stone-500 text-sm">
                <span className="text-2xl font-bold text-stone-800">{plan.price}</span>
                {plan.period}
              </p>
            </div>
            <ul className="flex flex-col gap-2 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-stone-600">
                  <Check className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href={`/pricing?plan=${plan.id}`}
              className={`text-center text-sm font-semibold py-2.5 rounded-lg transition-colors ${
                plan.highlight
                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                  : "bg-stone-100 hover:bg-stone-200 text-stone-800"
              }`}
            >
              Get {plan.name}
            </Link>
          </div>
        ))}
      </div>

      <Link href="/pricing" className="flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700 font-medium">
        <Zap className="w-4 h-4" />
        See all plans including Business & Enterprise
      </Link>

      <p className="mt-8 text-xs text-stone-400">
        No contracts. Cancel anytime. Questions?{" "}
        <a href="mailto:support@markethubpromo.com" className="underline">
          Contact support
        </a>
      </p>
    </div>
  );
}
