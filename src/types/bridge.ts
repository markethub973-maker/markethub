/** Bridge API types — shared between MarketHub and Zurio */

export interface BridgeHealthResponse {
  status: "ok";
  service: "markethub-bridge";
  db_connected: boolean;
  users_count: number;
  timestamp: number;
  version: string;
}

export interface BridgeLead {
  id: string;
  domain: string;
  business_name: string;
  email: string | null;
  phone: string | null;
  country_code: string | null;
  snippet: string | null;
  source: string;
  outreach_status: string;
  fit_score: number | null;
  detected_needs: string | null;
  last_scanned_at: string;
  created_at: string;
}

export interface BridgeLeadsResponse {
  leads: BridgeLead[];
  count: number;
  offset: number;
  limit: number;
}

export interface BridgeCreateLeadRequest {
  domain: string;
  business_name?: string;
  email?: string;
  phone?: string;
  country_code?: string;
  snippet?: string;
  source?: string;
  fit_score?: number;
  detected_needs?: string;
  outreach_status?: string;
}

export interface BridgeBrandVoiceProfile {
  id: string;
  user_id: string;
  client_name: string;
  tone: string;
  vocabulary: string[];
  style_notes: string;
  examples: string[];
  created_at: string;
  updated_at: string;
}

export interface BridgeBrandVoiceResponse {
  profiles: BridgeBrandVoiceProfile[];
}

export interface BridgeCreateDraftRequest {
  user_id: string;
  title: string;
  caption?: string;
  platform?: "instagram" | "facebook" | "tiktok" | "linkedin" | "youtube";
  date?: string;
  time?: string;
  hashtags?: string;
  image_url?: string;
  first_comment?: string;
  source?: string;
}

export interface BridgeDraftResponse {
  draft: {
    id: string;
    title: string;
    caption: string;
    platform: string;
    status: "draft";
    date: string;
    time: string;
    [key: string]: unknown;
  };
  created: boolean;
}
