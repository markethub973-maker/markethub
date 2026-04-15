"use client";

import OfferPage from "@/components/offer/OfferPage";

export default function OfferDePage() {
  return (
    <OfferPage
      copy={{
        tier: "de",
        price_display: "€1500",
        price_strikethrough: "€2999",
        badge: "Gründerpreis — nur die ersten 10 Kunden",
        headline_a: "Ihre nächsten 30 Tage",
        headline_highlight: "Marketing",
        headline_b: ", in 5 Tagen für Sie erledigt.",
        subheadline:
          "60 Captions, 20 KI-generierte Bilder, ein 30-Tage-Content-Kalender und 50 qualifizierte Leads — direkt in Ihr Postfach. Sie prüfen, genehmigen, sehen zu, wie es live geht.",
        microcopy: "⏱ 5–7 Tage Lieferung · 💳 Sichere Zahlung via Stripe · 💯 Kein Abonnement",
        price_note: "Einmalige Zahlung · 5–7 Tage Lieferung · Kein Abo",
        included: [
          "Markenstimmen-Analyse + 30-Tage-Content-Strategie",
          "60 Captions verteilt auf 2–3 Plattformen Ihrer Wahl (innerhalb sicherer Reichweiten-Limits)",
          "20 KI-generierte Markenbilder für Hero-Posts",
          "20–50 potenzielle Kunden in Ihrer Nische identifiziert + vorgeschriebene Outreach-Nachrichten",
          "1-stündiges Strategiegespräch (Zoom) + 30-Tage-Bericht zu veröffentlichten Posts",
          "Automatisch geplant — Sie prüfen und genehmigen",
        ],
        email_placeholder: "E-Mail (optional)",
        business_placeholder: "Unternehmensname",
        website_placeholder: "Website (optional)",
        cta: "Platz sichern — €1500",
        cta_loading: "Weiterleitung zum Checkout...",
        after_heading: "Was passiert nach der Zahlung",
        steps: [
          { t: "Onboarding-E-Mail (5 Min.)", d: "Kurzes Intake-Formular — Ihre Marke, Zielgruppe, Ziele." },
          { t: "Strategiegespräch (Tag 1)", d: "30-minütiges Zoom-Meeting zur Ausrichtung + Stimmenfreigabe." },
          { t: "Lieferung (Tag 5–7)", d: "60 Captions + 20 Bilder + Kalender in Ihrem Postfach." },
          { t: "30-Tage-Bericht", d: "Performance-Snapshot + Empfehlungen für nächste Schritte." },
        ],
        disclaimer:
          "Das Post-Volumen wird unter der sicheren Reichweitenschwelle jeder Plattform kalibriert — die genaue Plattformverteilung wird gemeinsam im Strategiegespräch entschieden. Wir versprechen keine fixe Follower- oder Umsatzzahl; wir liefern die Content- und Outreach-Infrastruktur, die Wachstum möglich macht.",
        footer_built_on: "Powered by MarketHub Pro · Sichere Zahlung via Stripe",
        footer_questions: "Fragen?",
      }}
    />
  );
}
