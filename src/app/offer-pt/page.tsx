"use client";

import OfferPage from "@/components/offer/OfferPage";

export default function OfferPtPage() {
  return (
    <OfferPage
      copy={{
        tier: "pt",
        price_display: "€700",
        price_strikethrough: "€1499",
        badge: "Preço cliente fundador — primeiros 10 clientes",
        headline_a: "Os seus próximos 30 dias de",
        headline_highlight: "marketing",
        headline_b: ", feitos por nós em 5 dias.",
        subheadline:
          "60 legendas, 20 imagens geradas por IA, um calendário de conteúdo de 30 dias e 50 leads qualificados — entregues na sua caixa de entrada. Você revê, aprova, vê a publicação acontecer.",
        microcopy: "⏱ Entrega em 5–7 dias · 💳 Pagamento seguro via Stripe · 💯 Sem subscrição",
        price_note: "Pagamento único · Entrega 5–7 dias · Sem subscrição",
        included: [
          "Análise de brand voice + estratégia de conteúdo de 30 dias",
          "60 legendas distribuídas em 2–3 plataformas à sua escolha (dentro dos limites seguros de alcance)",
          "20 imagens da marca geradas por IA para posts principais",
          "20–50 clientes potenciais identificados no seu nicho + mensagens de outreach pré-escritas",
          "Call estratégica de 1 hora (Zoom) + relatório de 30 dias sobre os posts publicados",
          "Agendado automaticamente — você revê e aprova",
        ],
        email_placeholder: "Email (opcional)",
        business_placeholder: "Nome do negócio",
        website_placeholder: "Website (opcional)",
        cta: "Reservar o meu lugar — €700",
        cta_loading: "A redirecionar para pagamento...",
        after_heading: "O que acontece depois do pagamento",
        steps: [
          { t: "Email de onboarding (5 min)", d: "Formulário rápido — a sua marca, audiência, objetivos." },
          { t: "Call estratégica (dia 1)", d: "Zoom de 30 min para alinhar direção + aprovar a voz." },
          { t: "Entrega (dia 5–7)", d: "60 legendas + 20 imagens + calendário na sua caixa." },
          { t: "Relatório 30 dias", d: "Snapshot de performance + recomendações seguintes." },
        ],
        disclaimer:
          "O volume de posts está calibrado abaixo do limiar de alcance seguro de cada plataforma — a distribuição exata é decidida em conjunto na call estratégica. Não prometemos um número fixo de seguidores ou vendas; entregamos a infraestrutura de conteúdo e outreach que torna o crescimento possível.",
        footer_built_on: "Desenvolvido por MarketHub Pro · Pagamento seguro por Stripe",
        footer_questions: "Dúvidas?",
      }}
    />
  );
}
