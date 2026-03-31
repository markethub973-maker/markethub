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
        label: "Anthropic API Key (dev)",
        masked: mask(process.env.ANTHROPIC_API_KEY, 7),
        configured: !!process.env.ANTHROPIC_API_KEY,
      },
      apiKeyApp: {
        label: "Anthropic API Key (app)",
        masked: mask(process.env.ANTHROPIC_API_KEY_APP, 7),
        configured: !!process.env.ANTHROPIC_API_KEY_APP,
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
      serviceRoleKey: {
        label: "Supabase Service Role Key",
        masked: mask(process.env.SUPABASE_SERVICE_ROLE_KEY, 8),
        configured: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
    },
    other: {
      rapidApi: {
        label: "RapidAPI Key",
        masked: mask(process.env.RAPIDAPI_KEY, 8),
        configured: !!process.env.RAPIDAPI_KEY,
      },
      newsApi: {
        label: "News API Key",
        masked: mask(process.env.NEWS_API_KEY, 6),
        configured: !!process.env.NEWS_API_KEY,
      },
      resend: {
        label: "Resend API Key",
        masked: mask(process.env.RESEND_API_KEY, 6),
        configured: !!process.env.RESEND_API_KEY,
      },
    },
  };

  return NextResponse.json({ success: true, credentials });
}
