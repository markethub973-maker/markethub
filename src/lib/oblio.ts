/**
 * Oblio API integration — emitere automată factură la plată Stripe
 * Docs: https://www.oblio.eu/integrari/api
 */

const OBLIO_API = "https://www.oblio.eu/api";

// ── Auth — OAuth2 client_credentials ─────────────────────────────────────────
let _cachedToken: { token: string; expiresAt: number } | null = null;

async function getOblioToken(): Promise<string> {
  if (_cachedToken && Date.now() < _cachedToken.expiresAt - 60_000) {
    return _cachedToken.token;
  }

  const res = await fetch(`${OBLIO_API}/authorize/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.OBLIO_CLIENT_ID,
      client_secret: process.env.OBLIO_CLIENT_SECRET,
      grant_type: "client_credentials",
    }),
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Oblio auth failed: ${JSON.stringify(data)}`);
  }

  _cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return _cachedToken.token;
}

// ── Plan config ───────────────────────────────────────────────────────────────
const PLAN_PRICES: Record<string, number> = {
  lite: 24,
  pro: 49,
  business: 99,
  enterprise: 249,
};

const PLAN_LABELS: Record<string, string> = {
  lite: "Creator",
  pro: "Pro",
  business: "Studio",
  enterprise: "Agency",
};

// ── Emite factură ─────────────────────────────────────────────────────────────
export interface OblioInvoiceParams {
  clientName: string;
  clientEmail: string;
  plan: string;
  amountUsd: number;      // suma plătită în USD
  stripeInvoiceId: string;
  issueDate?: string;     // YYYY-MM-DD, default azi
}

export interface OblioInvoiceResult {
  ok: boolean;
  seriesName?: string;
  number?: string;
  link?: string;
  error?: string;
}

export async function emitOblioInvoice(params: OblioInvoiceParams): Promise<OblioInvoiceResult> {
  if (!process.env.OBLIO_CLIENT_ID || !process.env.OBLIO_CLIENT_SECRET) {
    return { ok: false, error: "Oblio credentials not configured" };
  }

  try {
    const token = await getOblioToken();
    const cif = process.env.OBLIO_CIF;
    if (!cif) return { ok: false, error: "OBLIO_CIF not configured" };
    const issueDate = params.issueDate ?? new Date().toISOString().split("T")[0];
    const planLabel = PLAN_LABELS[params.plan] ?? params.plan;
    const price = params.amountUsd > 0 ? params.amountUsd : (PLAN_PRICES[params.plan] ?? 0);

    const body = {
      cif,
      seriesName: "MMP2026",
      client: {
        name: params.clientName || params.clientEmail,
        email: params.clientEmail,
        address: "Online",
        county: "",
        country: "Romania",
      },
      issueDate,
      dueDate: issueDate,
      deliveryDate: issueDate,
      products: [
        {
          name: `MarketHub Pro — Abonament ${planLabel}`,
          description: `Abonament lunar plan ${planLabel} — ${params.stripeInvoiceId}`,
          code: `MHP-${params.plan.toUpperCase()}`,
          measuringUnit: "buc",
          currency: "USD",
          quantity: 1,
          price,
          vatName: "Fara TVA",
          vatPercentage: 0,
          vatIncluded: false,
        },
      ],
      language: "RO",
      precision: 2,
      currency: "USD",
      useStock: false,
    };

    const res = await fetch(`${OBLIO_API}/docs/invoice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (res.ok && data.status === 200) {
      const inv = data.data;

      // Marchează factura ca încasată cu Card (plată Stripe)
      if (inv?.seriesName && inv?.number) {
        const dateStr = new Date().toISOString().split("T")[0];
        await fetch(`${OBLIO_API}/docs/collect`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            cif,
            seriesName: inv.seriesName,
            number: inv.number,
            type: "Card",
            documentDate: dateStr,
            value: params.amountUsd > 0 ? params.amountUsd : (PLAN_PRICES[params.plan] ?? 0),
            documentNumber: `STRIPE-${params.stripeInvoiceId.slice(-12).toUpperCase()}`,
          }),
        }).catch(() => {}); // non-fatal
      }

      return {
        ok: true,
        seriesName: inv?.seriesName,
        number: inv?.number,
        link: inv?.link,
      };
    }

    return {
      ok: false,
      error: data.statusMessage ?? JSON.stringify(data),
    };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}
