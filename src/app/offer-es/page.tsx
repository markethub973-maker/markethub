"use client";

import OfferPage from "@/components/offer/OfferPage";

export default function OfferEsPage() {
  return (
    <OfferPage
      copy={{
        tier: "es",
        price_display: "€900",
        price_strikethrough: "€1899",
        badge: "Precio cliente fundador — primeros 10 clientes",
        headline_a: "Tus próximos 30 días de",
        headline_highlight: "marketing",
        headline_b: ", hechos por nosotros en 5 días.",
        subheadline:
          "60 captions, 20 imágenes generadas por IA, un calendario de contenido de 30 días y 50 leads cualificados — entregados en tu bandeja. Tú revisas, apruebas, ves cómo se publica.",
        microcopy: "⏱ Entrega en 5–7 días · 💳 Pago seguro vía Stripe · 💯 Sin suscripción",
        price_note: "Pago único · Entrega 5–7 días · Sin suscripción",
        included: [
          "Análisis de brand voice + estrategia de contenido a 30 días",
          "60 captions distribuidos en 2–3 plataformas de tu elección (dentro de los límites seguros de alcance)",
          "20 imágenes brandeadas generadas por IA para posts destacados",
          "20–50 clientes potenciales identificados en tu nicho + mensajes de outreach pre-redactados",
          "Call estratégica de 1 hora (Zoom) + reporte de 30 días sobre los posts publicados",
          "Programado automáticamente — tú revisas y apruebas",
        ],
        email_placeholder: "Email (opcional)",
        business_placeholder: "Nombre del negocio",
        website_placeholder: "Sitio web (opcional)",
        cta: "Reservar mi plaza — €900",
        cta_loading: "Redirigiendo al pago...",
        after_heading: "Qué ocurre después de pagar",
        steps: [
          { t: "Email de onboarding (5 min)", d: "Formulario rápido — tu marca, audiencia, objetivos." },
          { t: "Call estratégica (día 1)", d: "Zoom de 30 min para alinear dirección + aprobar la voz." },
          { t: "Entrega (día 5–7)", d: "60 captions + 20 imágenes + calendario en tu bandeja." },
          { t: "Reporte 30 días", d: "Snapshot de rendimiento + recomendaciones siguientes." },
        ],
        disclaimer:
          "El volumen de posts está calibrado bajo el umbral de alcance seguro de cada plataforma — la distribución exacta se decide juntos en la call estratégica. No prometemos un número fijo de seguidores o ventas; entregamos la infraestructura de contenido y outreach que hace posible el crecimiento.",
        footer_built_on: "Impulsado por MarketHub Pro · Pago seguro por Stripe",
        footer_questions: "¿Preguntas?",
      }}
    />
  );
}
