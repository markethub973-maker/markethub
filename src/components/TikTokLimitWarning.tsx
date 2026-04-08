"use client";

import { AlertCircle, TrendingUp } from "lucide-react";
import Link from "next/link";

interface TikTokLimitWarningProps {
  currentUsage?: number;
  limit?: number;
  planName?: string;
}

export default function TikTokLimitWarning({
  currentUsage = 10,
  limit = 10,
  planName = "Free Trial",
}: TikTokLimitWarningProps) {
  const usagePercentage = Math.round((currentUsage / limit) * 100);
  const isAtLimit = currentUsage >= limit;

  if (!isAtLimit) {
    return null; // Don't show if not at limit
  }

  return (
    <div className="rounded-lg border-l-4 border-orange-500 bg-orange-50 p-6 mb-6">
      <div className="flex gap-4">
        <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-orange-900 mb-2">
            🎬 TikTok Video Limit Reached
          </h3>
          <p className="text-sm text-orange-800 mb-4">
            Your <strong>{planName}</strong> plan allows <strong>{limit} TikTok videos per month</strong>.
            You've used all your allocated videos ({currentUsage}/{limit}).
          </p>

          {/* Usage Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-orange-700 mb-1">
              <span>Monthly Usage</span>
              <span>{usagePercentage}%</span>
            </div>
            <div className="w-full bg-orange-200 rounded-full h-2">
              <div
                className="bg-orange-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Upgrade Options */}
          <div className="bg-white rounded-md p-4 mb-4">
            <p className="text-sm font-medium text-gray-900 mb-3">
              📈 Upgrade to get more TikTok videos:
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">
                  <strong>Lite Plan:</strong> Unlimited TikTok videos
                </span>
                <span className="text-orange-600 font-semibold">$24/mo</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">
                  <strong>Pro Plan:</strong> Unlimited TikTok videos
                </span>
                <span className="text-orange-600 font-semibold">$49/mo</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">
                  <strong>Business Plan:</strong> Unlimited TikTok videos
                </span>
                <span className="text-orange-600 font-semibold">$99/mo</span>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-3">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              <TrendingUp className="w-4 h-4" />
              View Plans
            </Link>
            <Link
              href="/upgrade"
              className="inline-flex items-center gap-2 border border-orange-300 bg-white hover:bg-orange-50 text-orange-600 font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
