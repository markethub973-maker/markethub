"use client";

import OfferPage from "@/components/offer/OfferPage";

export default function OfferFrPage() {
  return (
    <OfferPage
      copy={{
        tier: "fr",
        price_display: "€1200",
        price_strikethrough: "€2499",
        badge: "Tarif client fondateur — 10 premiers clients",
        headline_a: "Vos 30 prochains jours de",
        headline_highlight: "marketing",
        headline_b: ", livrés en 5 jours.",
        subheadline:
          "60 légendes, 20 images générées par IA, un calendrier de contenu de 30 jours et 50 prospects qualifiés — livrés dans votre boîte mail. Vous vérifiez, approuvez, regardez publier.",
        microcopy: "⏱ Livraison en 5–7 jours · 💳 Paiement sécurisé via Stripe · 💯 Sans abonnement",
        price_note: "Paiement unique · Livraison 5–7 jours · Sans abonnement",
        included: [
          "Analyse de la voix de marque + stratégie de contenu sur 30 jours",
          "60 légendes réparties sur 2–3 plateformes de votre choix (dans les limites de portée sûres)",
          "20 images brandées générées par IA pour les posts phares",
          "20–50 clients potentiels identifiés dans votre niche + messages de prospection pré-rédigés",
          "Appel stratégique d'1 heure (Zoom) + rapport 30 jours sur les posts publiés",
          "Planifié automatiquement — vous vérifiez et approuvez",
        ],
        email_placeholder: "Email (optionnel)",
        business_placeholder: "Nom de l'entreprise",
        website_placeholder: "Site web (optionnel)",
        cta: "Réserver ma place — €1200",
        cta_loading: "Redirection vers le paiement...",
        after_heading: "Ce qui se passe après le paiement",
        steps: [
          { t: "Email d'onboarding (5 min)", d: "Formulaire rapide — votre marque, audience, objectifs." },
          { t: "Appel stratégique (jour 1)", d: "Zoom de 30 min pour aligner la direction + approuver la voix." },
          { t: "Livraison (jour 5–7)", d: "60 légendes + 20 images + calendrier dans votre boîte mail." },
          { t: "Rapport 30 jours", d: "Bilan performance + recommandations des prochaines étapes." },
        ],
        disclaimer:
          "Le volume de posts est calibré sous le seuil de portée sûre de chaque plateforme — la répartition exacte est décidée ensemble lors de l'appel stratégique. Nous ne promettons pas un nombre fixe de followers ou de ventes ; nous livrons l'infrastructure de contenu et de prospection qui rend la croissance possible.",
        footer_built_on: "Propulsé par MarketHub Pro · Paiement sécurisé par Stripe",
        footer_questions: "Des questions ?",
      }}
    />
  );
}
