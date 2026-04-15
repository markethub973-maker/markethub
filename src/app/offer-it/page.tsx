"use client";

import OfferPage from "@/components/offer/OfferPage";

export default function OfferItPage() {
  return (
    <OfferPage
      copy={{
        tier: "it",
        price_display: "€900",
        price_strikethrough: "€1899",
        badge: "Prezzo cliente fondatore — primi 10 clienti",
        headline_a: "I tuoi prossimi 30 giorni di",
        headline_highlight: "marketing",
        headline_b: ", fatti per te in 5 giorni.",
        subheadline:
          "60 caption, 20 immagini generate dall'IA, un calendario contenuti di 30 giorni e 50 lead qualificati — consegnati nella tua casella. Tu verifichi, approvi, guardi pubblicare.",
        microcopy: "⏱ Consegna in 5–7 giorni · 💳 Pagamento sicuro via Stripe · 💯 Nessun abbonamento",
        price_note: "Pagamento unico · Consegna 5–7 giorni · Nessun abbonamento",
        included: [
          "Analisi del brand voice + strategia di contenuto a 30 giorni",
          "60 caption distribuite su 2–3 piattaforme a tua scelta (entro i limiti di reach sicuri)",
          "20 immagini brandizzate generate dall'IA per i post principali",
          "20–50 potenziali clienti identificati nella tua nicchia + messaggi di outreach pre-scritti",
          "Call strategica di 1 ora (Zoom) + report a 30 giorni sui post pubblicati",
          "Pianificato automaticamente — tu verifichi e approvi",
        ],
        email_placeholder: "Email (opzionale)",
        business_placeholder: "Nome dell'attività",
        website_placeholder: "Sito web (opzionale)",
        cta: "Prenota il posto — €900",
        cta_loading: "Reindirizzamento al checkout...",
        after_heading: "Cosa succede dopo il pagamento",
        steps: [
          { t: "Email di onboarding (5 min)", d: "Modulo rapido — il tuo brand, audience, obiettivi." },
          { t: "Call strategica (giorno 1)", d: "Zoom di 30 min per allineare direzione + approvare la voice." },
          { t: "Consegna (giorno 5–7)", d: "60 caption + 20 immagini + calendario nella tua inbox." },
          { t: "Report a 30 giorni", d: "Snapshot delle performance + raccomandazioni per i prossimi passi." },
        ],
        disclaimer:
          "Il volume dei post è calibrato sotto la soglia di reach sicuro di ogni piattaforma — la distribuzione esatta viene decisa insieme durante la call strategica. Non promettiamo un numero fisso di follower o vendite; consegniamo l'infrastruttura di contenuti e outreach che rende possibile la crescita.",
        footer_built_on: "Powered by MarketHub Pro · Pagamento sicuro tramite Stripe",
        footer_questions: "Domande?",
      }}
    />
  );
}
