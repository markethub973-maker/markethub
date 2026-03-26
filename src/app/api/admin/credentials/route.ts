import { NextResponse } from "next/server";

function mask(val: string | undefined, showChars = 6): string {
  if (!val) return "— not set —";
  if (val.length <= showChars) return val;
  return val.slice(0, showChars) + "•".repeat(Math.min(val.length - showChars, 20));
}

export async function GET() {
  // Only expose from server-side — env vars never reach the browser bundle
  const credentials = {
    youtube: {
      apiKey: {
        label: "YouTube API Key",
        masked: mask(process.env.YOUTUBE_API_KEY),
        configured: !!process.env.YOUTUBE_API_KEY,
      },
    },
    instagram: {
      appId: {
        label: "Instagram App ID",
        masked: mask(process.env.INSTAGRAM_APP_ID),
        configured: !!process.env.INSTAGRAM_APP_ID,
      },
      appSecret: {
        label: "Instagram App Secret",
        masked: mask(process.env.INSTAGRAM_APP_SECRET, 4),
        configured: !!process.env.INSTAGRAM_APP_SECRET,
      },
      redirectUri: {
        label: "Instagram Redirect URI",
        masked: process.env.INSTAGRAM_REDIRECT_URI || "— not set —",
        configured: !!process.env.INSTAGRAM_REDIRECT_URI,
      },
    },
    anthropic: {
      apiKey: {
        label: "Anthropic API Key",
        masked: mask(process.env.ANTHROPIC_API_KEY, 7),
        configured: !!process.env.ANTHROPIC_API_KEY,
      },
    },
    stripe: {
      secretKey: {
        label: "Stripe Secret Key",
        masked: mask(process.env.STRIPE_SECRET_KEY, 8),
        configured: !!process.env.STRIPE_SECRET_KEY,
      },
      webhookSecret: {
        label: "Stripe Webhook Secret",
        masked: mask(process.env.STRIPE_WEBHOOK_SECRET, 6),
        configured: !!process.env.STRIPE_WEBHOOK_SECRET,
      },
    },
    supabase: {
      url: {
        label: "Supabase URL",
        masked: process.env.NEXT_PUBLIC_SUPABASE_URL || "— not set —",
        configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      },
      anonKey: {
        label: "Supabase Anon Key",
        masked: mask(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 8),
        configured: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
    },
  };

  return NextResponse.json({ success: true, credentials });
}
