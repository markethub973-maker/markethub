"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Zap, Star } from "lucide-react";

const AMBER = "#F59E0B";
const GREEN = "#1DB954";
const BLUE  = "#3B82F6";
const PURPLE = "#8B5CF6";

// ── Types ─────────────────────────────────────────────────────────────────────
type Priority = "must" | "recommended" | "optional";
type Category = "social" | "outreach" | "marketplace" | "analytics" | "automation" | "creation";

interface ExtService {
  name: string;
  desc: string;
  domain: string;           // display only — no clickable URL generated
  category: Category;
  free: boolean;
}

interface ChannelRec {
  channelId: string;
  emoji: string;
  label: string;
  priority: Priority;
  why: string;
  services: ExtService[];
}

interface OfferConfig {
  label: string;
  topChannels: string[];    // ordered channel IDs (most important first)
  researchSources: { id: string; label: string; emoji: string; why: string }[];
  channels: ChannelRec[];
  adjacentHints: ExtService[];
}

// ── External service definitions ──────────────────────────────────────────────
const EXT: Record<string, ExtService> = {
  mailchimp:   { name: "Mailchimp",      desc: "Email marketing & automations",          domain: "mailchimp.com",         category: "outreach",     free: true  },
  brevo:       { name: "Brevo",          desc: "Email + SMS + WhatsApp campaigns",        domain: "brevo.com",             category: "outreach",     free: true  },
  twilio:      { name: "Twilio",         desc: "SMS & WhatsApp API programatic",          domain: "twilio.com",            category: "outreach",     free: false },
  textmagic:   { name: "TextMagic",      desc: "SMS bulk sending pentru România",         domain: "textmagic.com",         category: "outreach",     free: false },
  buffer:      { name: "Buffer",         desc: "Programare postări social media",         domain: "buffer.com",            category: "automation",   free: true  },
  hootsuite:   { name: "Hootsuite",      desc: "Management social media multi-canal",     domain: "hootsuite.com",         category: "automation",   free: false },
  later:       { name: "Later",          desc: "Planificare vizuală Instagram/TikTok",    domain: "later.com",             category: "automation",   free: true  },
  canva:       { name: "Canva",          desc: "Design rapid postări, stories, bannere",  domain: "canva.com",             category: "creation",     free: true  },
  capcut:      { name: "CapCut",         desc: "Editare video TikTok/Reel nativă",        domain: "capcut.com",            category: "creation",     free: true  },
  carrd:       { name: "Carrd",          desc: "Landing page simplu în <30 min",          domain: "carrd.co",              category: "creation",     free: true  },
  webflow:     { name: "Webflow",        desc: "Landing page profesional no-code",        domain: "webflow.com",           category: "creation",     free: true  },
  ga4:         { name: "Google Analytics 4", desc: "Tracking trafic și conversii",       domain: "analytics.google.com",  category: "analytics",    free: true  },
  hotjar:      { name: "Hotjar",         desc: "Heatmaps și înregistrări sesiuni",        domain: "hotjar.com",            category: "analytics",    free: true  },
  metapixel:   { name: "Meta Pixel",     desc: "Tracking Facebook/Instagram ads",         domain: "business.facebook.com", category: "analytics",    free: true  },
  gbusiness:   { name: "Google Business", desc: "Profil Google Maps pentru local",       domain: "business.google.com",   category: "marketplace",  free: true  },
  glovo:       { name: "Glovo",          desc: "Listare restaurant/magazin pentru livrări",domain: "glovo.com",            category: "marketplace",  free: false },
  tazz:        { name: "Tazz",           desc: "Food delivery România",                   domain: "tazz.ro",               category: "marketplace",  free: false },
  boltfood:    { name: "Bolt Food",      desc: "Food delivery alternativ România",        domain: "food.bolt.eu",          category: "marketplace",  free: false },
  tripadvisor: { name: "TripAdvisor",    desc: "Recenzii & vizibilitate restaurant",      domain: "tripadvisor.com",       category: "marketplace",  free: true  },
  shopify:     { name: "Shopify",        desc: "Magazin online all-in-one",               domain: "shopify.com",           category: "marketplace",  free: false },
  woo:         { name: "WooCommerce",    desc: "eCommerce pe WordPress",                  domain: "woocommerce.com",       category: "marketplace",  free: true  },
  fbshops:     { name: "Facebook Shops", desc: "Catalog de produse pe Facebook/Insta",   domain: "business.facebook.com", category: "social",       free: true  },
  gads:        { name: "Google Ads",     desc: "Reclame Google Search & Display",         domain: "ads.google.com",        category: "outreach",     free: false },
  metaads:     { name: "Meta Ads",       desc: "Reclame Facebook & Instagram",            domain: "business.facebook.com", category: "outreach",     free: false },
  tiktokads:   { name: "TikTok Ads",     desc: "Reclame TikTok for Business",             domain: "ads.tiktok.com",        category: "outreach",     free: false },
  linkedin:    { name: "LinkedIn Ads",   desc: "B2B targeting precis pe funcție/industrie",domain: "business.linkedin.com", category: "outreach",     free: false },
  hunter:      { name: "Hunter.io",      desc: "Găsire email-uri business B2B",           domain: "hunter.io",             category: "outreach",     free: true  },
  apollo:      { name: "Apollo.io",      desc: "Prospectare B2B + email outreach",        domain: "apollo.io",             category: "outreach",     free: true  },
  imobiliare:  { name: "Imobiliare.ro",  desc: "Listare proprietăți piața românească",    domain: "imobiliare.ro",         category: "marketplace",  free: false },
  storia:      { name: "Storia.ro",      desc: "Alternativă imobiliare România",          domain: "storia.ro",             category: "marketplace",  free: false },
  olx:         { name: "OLX",            desc: "Marketplace general + imobiliare",        domain: "olx.ro",                category: "marketplace",  free: true  },
  udemy:       { name: "Udemy",          desc: "Publică cursuri pentru audiență globală", domain: "udemy.com",             category: "marketplace",  free: false },
  teachable:   { name: "Teachable",      desc: "Platformă cursuri cu branding propriu",   domain: "teachable.com",         category: "marketplace",  free: true  },
  performant:  { name: "2Performant",    desc: "Rețea afiliați România",                  domain: "2performant.com",       category: "marketplace",  free: false },
  admitad:     { name: "Admitad",        desc: "Rețea afiliați Europa",                   domain: "admitad.com",           category: "marketplace",  free: false },
  fresha:      { name: "Fresha",         desc: "Rezervări salon/spa fără comision",       domain: "fresha.com",            category: "marketplace",  free: true  },
  booksy:      { name: "Booksy",         desc: "Rezervări beauty & wellness",             domain: "booksy.com",            category: "marketplace",  free: false },
  typeform:    { name: "Typeform",       desc: "Formulare & lead magnets interactive",    domain: "typeform.com",          category: "creation",     free: true  },
  zapier:      { name: "Zapier",         desc: "Automatizare între platforme fără cod",   domain: "zapier.com",            category: "automation",   free: true  },
  make:        { name: "Make",           desc: "Automatizare vizuală avansată (fostul Integromat)", domain: "make.com",  category: "automation",   free: true  },
};

// ── Per-offer-type config ─────────────────────────────────────────────────────
const CONFIGS: Record<string, OfferConfig> = {
  service: {
    label: "Serviciu local",
    topChannels: ["whatsapp", "sms", "facebook_post", "instagram_post", "email", "landing_page"],
    researchSources: [
      { id: "google_maps", label: "Google Maps", emoji: "🗺️", why: "Clienții caută servicii pe Maps înainte de orice altceva" },
      { id: "facebook_groups", label: "Grupuri Facebook", emoji: "👥", why: "Grupuri locale unde oamenii cer recomandări de servicii" },
      { id: "google", label: "Google Search", emoji: "🔍", why: "Căutări active 'serviciu + localitate'" },
    ],
    channels: [
      { channelId: "whatsapp", emoji: "💬", label: "WhatsApp", priority: "must", why: "Clienții locali preferă WhatsApp pentru servicii — răspuns rapid, conversie mare", services: [EXT.brevo, EXT.twilio] },
      { channelId: "sms", emoji: "📱", label: "SMS", priority: "must", why: "Reach direct 98% deschidere — ideal pentru confirmare programare", services: [EXT.textmagic, EXT.brevo] },
      { channelId: "facebook_post", emoji: "👥", label: "Facebook Post", priority: "recommended", why: "Grupuri locale de cartier — cea mai organică sursă pentru servicii", services: [EXT.buffer, EXT.canva] },
      { channelId: "landing_page", emoji: "🌐", label: "Landing Page", priority: "recommended", why: "Pagina unde trimiți traficul din toate canalele", services: [EXT.carrd, EXT.typeform] },
      { channelId: "instagram_post", emoji: "📸", label: "Instagram", priority: "optional", why: "Brand awareness — postări before/after dacă serviciul e vizual", services: [EXT.later, EXT.canva] },
      { channelId: "email", emoji: "📧", label: "Email", priority: "optional", why: "Newsletter pentru clienți recurenți", services: [EXT.mailchimp, EXT.brevo] },
    ],
    adjacentHints: [EXT.gbusiness, EXT.canva, EXT.zapier, EXT.ga4, EXT.typeform],
  },
  event_entertain: {
    label: "Events & Entertainment",
    topChannels: ["instagram_post", "facebook_post", "video_brief", "photo_brief", "whatsapp", "landing_page"],
    researchSources: [
      { id: "facebook_groups", label: "Grupuri Facebook", emoji: "👥", why: "Grupuri de nunți, botezuri, corporate events" },
      { id: "instagram_hashtag", label: "Instagram Hashtags", emoji: "📸", why: "Hashtag-uri de events locale + tendințe vizuale" },
      { id: "google", label: "Google Search", emoji: "🔍", why: "Căutări 'DJ nuntă', 'fotograf botez' + localitate" },
    ],
    channels: [
      { channelId: "instagram_post", emoji: "📸", label: "Instagram", priority: "must", why: "Industria events trăiește pe Instagram — portofoliu vizual convertește direct", services: [EXT.later, EXT.canva, EXT.capcut] },
      { channelId: "video_brief", emoji: "🎬", label: "Brief Video", priority: "must", why: "Videoclipurile de la evenimente = cel mai puternic social proof", services: [EXT.capcut, EXT.canva] },
      { channelId: "photo_brief", emoji: "📷", label: "Brief Foto", priority: "must", why: "Portofoliu foto = prima impresie pentru clienți", services: [EXT.canva] },
      { channelId: "facebook_post", emoji: "👥", label: "Facebook Post", priority: "recommended", why: "Grupuri de nunți/botezuri — recomandările circulă rapid", services: [EXT.buffer] },
      { channelId: "whatsapp", emoji: "💬", label: "WhatsApp", priority: "recommended", why: "Follow-up rapid după prim contact și confirmări", services: [EXT.brevo, EXT.twilio] },
      { channelId: "landing_page", emoji: "🌐", label: "Landing Page", priority: "recommended", why: "Portofoliu + formular de rezervare = conversie maximă", services: [EXT.carrd, EXT.typeform] },
    ],
    adjacentHints: [EXT.canva, EXT.capcut, EXT.later, EXT.gbusiness, EXT.metaads, EXT.ga4],
  },
  food_beverage: {
    label: "Mâncare & Băuturi",
    topChannels: ["whatsapp", "instagram_post", "facebook_post", "sms", "tiktok", "landing_page"],
    researchSources: [
      { id: "google_maps", label: "Google Maps", emoji: "🗺️", why: "Principala sursă pentru restaurante — recenzii și localizare" },
      { id: "reviews", label: "Maps Reviews", emoji: "⭐", why: "Recenziile sunt factorul #1 în alegerea unui restaurant" },
      { id: "facebook_groups", label: "Grupuri Facebook", emoji: "👥", why: "Grupuri de foodies și recomandări locale" },
    ],
    channels: [
      { channelId: "instagram_post", emoji: "📸", label: "Instagram", priority: "must", why: "Food content = cel mai înalt engagement pe Instagram — mâncare fotogenică viral rapid", services: [EXT.later, EXT.canva, EXT.capcut] },
      { channelId: "whatsapp", emoji: "💬", label: "WhatsApp", priority: "must", why: "Comenzi și rezervări rapide — clienții fideli preferă WhatsApp", services: [EXT.brevo, EXT.twilio] },
      { channelId: "tiktok", emoji: "🎵", label: "TikTok/Reel", priority: "must", why: "Food TikToks au viral rate enorm — ASMR cooking, behind the scenes, recenzii", services: [EXT.capcut, EXT.tiktokads] },
      { channelId: "facebook_post", emoji: "👥", label: "Facebook Post", priority: "recommended", why: "Audiența locală matură — speciale zilnice, meniuri, oferte", services: [EXT.buffer, EXT.canva] },
      { channelId: "sms", emoji: "📱", label: "SMS", priority: "recommended", why: "Notificări promoții zilnice pentru clienți fideli", services: [EXT.textmagic] },
      { channelId: "landing_page", emoji: "🌐", label: "Landing Page", priority: "optional", why: "Meniu online + rezervări — esențial pentru restaurant modern", services: [EXT.carrd, EXT.typeform] },
    ],
    adjacentHints: [EXT.glovo, EXT.tazz, EXT.boltfood, EXT.gbusiness, EXT.tripadvisor, EXT.metapixel],
  },
  ecommerce: {
    label: "Magazin online",
    topChannels: ["instagram_post", "facebook_post", "email", "tiktok", "sms", "landing_page"],
    researchSources: [
      { id: "google", label: "Google Search", emoji: "🔍", why: "Intenție de cumpărare clară — căutări de produs + comparații" },
      { id: "reddit", label: "Reddit", emoji: "🟠", why: "Review-uri autentice și comunități de pasionați" },
      { id: "instagram_hashtag", label: "Instagram Hashtags", emoji: "📸", why: "Competitori și trenduri de produs" },
    ],
    channels: [
      { channelId: "instagram_post", emoji: "📸", label: "Instagram", priority: "must", why: "Shopping pe Instagram direct din postări — catalog vizual cu link la produs", services: [EXT.fbshops, EXT.later, EXT.canva] },
      { channelId: "facebook_post", emoji: "👥", label: "Facebook Post", priority: "must", why: "Cea mai mare audiență pentru reclame retargeting și oferte flash", services: [EXT.metaads, EXT.metapixel, EXT.buffer] },
      { channelId: "email", emoji: "📧", label: "Email", priority: "must", why: "Newsletter + abandoned cart = cel mai profitabil canal în eCommerce", services: [EXT.mailchimp, EXT.brevo] },
      { channelId: "tiktok", emoji: "🎵", label: "TikTok", priority: "recommended", why: "Product unboxing și reviews virale — TikTok Shop în creștere rapidă", services: [EXT.tiktokads, EXT.capcut] },
      { channelId: "sms", emoji: "📱", label: "SMS", priority: "recommended", why: "Flash sales și restockuri — deschidere imediată", services: [EXT.textmagic, EXT.brevo] },
      { channelId: "landing_page", emoji: "🌐", label: "Landing Page", priority: "recommended", why: "Pagină dedicată per produs/colecție pentru campanii ads", services: [EXT.carrd, EXT.webflow] },
    ],
    adjacentHints: [EXT.shopify, EXT.woo, EXT.fbshops, EXT.gads, EXT.ga4, EXT.hotjar, EXT.zapier],
  },
  affiliate: {
    label: "Afiliere",
    topChannels: ["instagram_post", "tiktok", "facebook_post", "email", "landing_page", "video_brief"],
    researchSources: [
      { id: "reddit", label: "Reddit", emoji: "🟠", why: "Subreddituri de review-uri autentice — publicul caută opinii reale" },
      { id: "google", label: "Google Search", emoji: "🔍", why: "Căutări 'cel mai bun X', 'recenzie X' — intenție de cumpărare pre-decizie" },
      { id: "instagram_hashtag", label: "Instagram", emoji: "📸", why: "Influenceri afiliați și trenduri de produs" },
    ],
    channels: [
      { channelId: "instagram_post", emoji: "📸", label: "Instagram", priority: "must", why: "Link în bio + Stories cu swipe-up = convertor principal afiliați", services: [EXT.later, EXT.canva, EXT.metaads] },
      { channelId: "tiktok", emoji: "🎵", label: "TikTok/Reel", priority: "must", why: "Recenzii autentice și unboxing — TikTok Shop afiliați plătit per vânzare", services: [EXT.capcut, EXT.tiktokads] },
      { channelId: "video_brief", emoji: "🎬", label: "Brief Video", priority: "must", why: "YouTube review = trafic organic pe ani — cel mai profitabil pentru afiliați", services: [EXT.capcut, EXT.canva] },
      { channelId: "email", emoji: "📧", label: "Email", priority: "recommended", why: "Lista de email = activul #1 — nu depinde de algoritmi", services: [EXT.mailchimp, EXT.brevo] },
      { channelId: "landing_page", emoji: "🌐", label: "Landing Page", priority: "recommended", why: "Review page + link afiliat = pagina de conversie principală", services: [EXT.carrd, EXT.webflow, EXT.typeform] },
      { channelId: "facebook_post", emoji: "👥", label: "Facebook Post", priority: "optional", why: "Grupuri de pasionați + reclame retargeting", services: [EXT.buffer, EXT.metaads] },
    ],
    adjacentHints: [EXT.performant, EXT.admitad, EXT.ga4, EXT.hotjar, EXT.canva, EXT.zapier],
  },
  software: {
    label: "Software / App",
    topChannels: ["email", "landing_page", "instagram_post", "facebook_post", "tiktok", "video_brief"],
    researchSources: [
      { id: "reddit", label: "Reddit", emoji: "🟠", why: "Tech communities și review-uri autentice — r/SaaS, r/entrepreneur" },
      { id: "google", label: "Google Search", emoji: "🔍", why: "Căutări comparații alternative + review-uri" },
      { id: "research_website", label: "Analiză competitori", emoji: "🌐", why: "Mesaje de marketing ale competitorilor" },
    ],
    channels: [
      { channelId: "email", emoji: "📧", label: "Email", priority: "must", why: "Onboarding sequences + product updates = retenție SaaS", services: [EXT.mailchimp, EXT.brevo] },
      { channelId: "landing_page", emoji: "🌐", label: "Landing Page", priority: "must", why: "Pagina de conversie principală — headline + demo + pricing", services: [EXT.webflow, EXT.carrd, EXT.typeform] },
      { channelId: "video_brief", emoji: "🎬", label: "Brief Video", priority: "must", why: "Demo video = cel mai puternic element de conversie pentru SaaS", services: [EXT.canva, EXT.capcut] },
      { channelId: "instagram_post", emoji: "📸", label: "Instagram", priority: "recommended", why: "UI screenshots + product updates + behind the scenes building", services: [EXT.later, EXT.canva] },
      { channelId: "facebook_post", emoji: "👥", label: "Facebook Post", priority: "recommended", why: "Grupuri de antreprenori și nișă specifică", services: [EXT.buffer, EXT.metaads] },
      { channelId: "tiktok", emoji: "🎵", label: "TikTok", priority: "optional", why: "Product demos scurte + tips & tricks — audiență tech young", services: [EXT.capcut, EXT.tiktokads] },
    ],
    adjacentHints: [EXT.ga4, EXT.hotjar, EXT.typeform, EXT.zapier, EXT.make, EXT.gads],
  },
  digital_product: {
    label: "Produs digital",
    topChannels: ["instagram_post", "email", "tiktok", "landing_page", "facebook_post", "video_brief"],
    researchSources: [
      { id: "instagram_hashtag", label: "Instagram", emoji: "📸", why: "Comunități de creatori și cumpărători de produse digitale" },
      { id: "reddit", label: "Reddit", emoji: "🟠", why: "Subreddituri de nișă unde publicul tău stă" },
      { id: "google", label: "Google Search", emoji: "🔍", why: "Căutări de tips, tutorials și templates pe nișa ta" },
    ],
    channels: [
      { channelId: "instagram_post", emoji: "📸", label: "Instagram", priority: "must", why: "Preview pages, results screenshots, testimonials — convertor principal creatori", services: [EXT.later, EXT.canva] },
      { channelId: "email", emoji: "📧", label: "Email", priority: "must", why: "Lista = distribuitorul tău — launch sequence + freebie lead magnet", services: [EXT.mailchimp, EXT.brevo] },
      { channelId: "tiktok", emoji: "🎵", label: "TikTok", priority: "recommended", why: "Tips gratuite care duc la produsul tău — 'parte 1 din 3'", services: [EXT.capcut, EXT.tiktokads] },
      { channelId: "landing_page", emoji: "🌐", label: "Landing Page", priority: "recommended", why: "Pagina de vânzare cu testimoniale + preview + ofertă", services: [EXT.carrd, EXT.webflow, EXT.typeform] },
      { channelId: "facebook_post", emoji: "👥", label: "Facebook", priority: "optional", why: "Grupuri de nișă și reclame retargeting", services: [EXT.buffer, EXT.metaads] },
      { channelId: "video_brief", emoji: "🎬", label: "Brief Video", priority: "optional", why: "Tutorial YouTube care demonstrează valoarea produsului", services: [EXT.capcut, EXT.canva] },
    ],
    adjacentHints: [EXT.teachable, EXT.udemy, EXT.gads, EXT.metapixel, EXT.hotjar, EXT.zapier],
  },
  health_beauty: {
    label: "Sănătate & Beauty",
    topChannels: ["instagram_post", "tiktok", "facebook_post", "whatsapp", "video_brief", "landing_page"],
    researchSources: [
      { id: "instagram_hashtag", label: "Instagram Hashtags", emoji: "📸", why: "Beauty content = nișa #1 pe Instagram — concurență și inspirație" },
      { id: "google_maps", label: "Google Maps", emoji: "🗺️", why: "Căutări locale 'salon', 'spa', 'cosmetice' + recenzii" },
      { id: "tiktok_hashtag", label: "TikTok", emoji: "🎵", why: "BeautyTok — tendințe și tutoriale virale" },
    ],
    channels: [
      { channelId: "instagram_post", emoji: "📸", label: "Instagram", priority: "must", why: "Before/after, tutorials, produse — beauty e nativă pe Instagram", services: [EXT.later, EXT.canva, EXT.capcut] },
      { channelId: "tiktok", emoji: "🎵", label: "TikTok/Reel", priority: "must", why: "BeautyTok — tutoriale scurte cu produse = mii de vizualizări organic", services: [EXT.capcut, EXT.tiktokads] },
      { channelId: "video_brief", emoji: "🎬", label: "Brief Video", priority: "must", why: "Tutorial complet de utilizare produs sau procedură de salon", services: [EXT.capcut, EXT.canva] },
      { channelId: "facebook_post", emoji: "👥", label: "Facebook Post", priority: "recommended", why: "Promoții și audiența locală mai matură pentru servicii salon", services: [EXT.buffer, EXT.metaads] },
      { channelId: "whatsapp", emoji: "💬", label: "WhatsApp", priority: "recommended", why: "Rezervări rapide și follow-up clienți fideli", services: [EXT.brevo, EXT.twilio] },
      { channelId: "landing_page", emoji: "🌐", label: "Landing Page", priority: "optional", why: "Rezervare online + portfolio servicii + prețuri", services: [EXT.carrd, EXT.typeform] },
    ],
    adjacentHints: [EXT.fresha, EXT.booksy, EXT.gbusiness, EXT.canva, EXT.metapixel, EXT.ga4],
  },
  real_estate: {
    label: "Imobiliare",
    topChannels: ["facebook_post", "instagram_post", "email", "video_brief", "photo_brief", "landing_page"],
    researchSources: [
      { id: "google", label: "Google Search", emoji: "🔍", why: "Căutări active de proprietăți — intenție ridicată de cumpărare/închiriere" },
      { id: "google_maps", label: "Google Maps", emoji: "🗺️", why: "Localizarea proprietăților și zonă de referință" },
      { id: "facebook_groups", label: "Grupuri Facebook", emoji: "👥", why: "Grupuri imobiliare locale — cel mai activ canal pentru tranzacții" },
    ],
    channels: [
      { channelId: "facebook_post", emoji: "👥", label: "Facebook Post", priority: "must", why: "Grupuri imobiliare locale = sursa #1 de lead-uri organice în România", services: [EXT.buffer, EXT.metaads, EXT.canva] },
      { channelId: "photo_brief", emoji: "📷", label: "Brief Foto", priority: "must", why: "Fotografia profesională de proprietate = diferența dintre vânzare și stagnare", services: [EXT.canva] },
      { channelId: "video_brief", emoji: "🎬", label: "Brief Video", priority: "must", why: "Virtual tour video = vizualizări mai mari, clienti calificati", services: [EXT.capcut, EXT.canva] },
      { channelId: "email", emoji: "📧", label: "Email", priority: "recommended", why: "Newsletter cu proprietăți noi pentru baza de potențiali clienți", services: [EXT.mailchimp, EXT.brevo] },
      { channelId: "instagram_post", emoji: "📸", label: "Instagram", priority: "recommended", why: "Vizualizări proprietăți premium și brand de agenție", services: [EXT.later, EXT.canva] },
      { channelId: "landing_page", emoji: "🌐", label: "Landing Page", priority: "optional", why: "Pagină dedicată proprietate cu galerie + formular contact", services: [EXT.carrd, EXT.webflow, EXT.typeform] },
    ],
    adjacentHints: [EXT.imobiliare, EXT.storia, EXT.olx, EXT.gads, EXT.ga4, EXT.canva],
  },
  education: {
    label: "Educație & Cursuri",
    topChannels: ["email", "landing_page", "instagram_post", "tiktok", "facebook_post", "video_brief"],
    researchSources: [
      { id: "google", label: "Google Search", emoji: "🔍", why: "Căutări 'curs X', 'cum să înveți X' — intenție educațională" },
      { id: "facebook_groups", label: "Grupuri Facebook", emoji: "👥", why: "Comunități de elevi/studenți și grupuri de dezvoltare profesională" },
      { id: "reddit", label: "Reddit", emoji: "🟠", why: "Subreddituri de learning + nișa cursului" },
    ],
    channels: [
      { channelId: "email", emoji: "📧", label: "Email", priority: "must", why: "Nurturing secvență lungă — studenții iau decizii lent, email construiește încredere", services: [EXT.mailchimp, EXT.brevo] },
      { channelId: "landing_page", emoji: "🌐", label: "Landing Page", priority: "must", why: "Pagina de înregistrare cu curriculum, testimoniale și garanție", services: [EXT.webflow, EXT.carrd, EXT.typeform] },
      { channelId: "video_brief", emoji: "🎬", label: "Brief Video", priority: "must", why: "Preview lecție gratuită = cel mai puternic convertor pentru cursuri", services: [EXT.capcut, EXT.canva] },
      { channelId: "instagram_post", emoji: "📸", label: "Instagram", priority: "recommended", why: "Tips educaționale gratuite care construiesc audiența", services: [EXT.later, EXT.canva] },
      { channelId: "tiktok", emoji: "🎵", label: "TikTok", priority: "recommended", why: "Micro-lecții de 60s — EdTok în creștere masivă", services: [EXT.capcut, EXT.tiktokads] },
      { channelId: "facebook_post", emoji: "👥", label: "Facebook Post", priority: "optional", why: "Grupuri de nișă și reclame targetate pe ocupație/vârstă", services: [EXT.buffer, EXT.metaads] },
    ],
    adjacentHints: [EXT.teachable, EXT.udemy, EXT.typeform, EXT.zapier, EXT.ga4, EXT.metapixel],
  },
  b2b_services: {
    label: "Servicii B2B",
    topChannels: ["email", "linkedin", "landing_page", "facebook_post", "video_brief", "sms"],
    researchSources: [
      { id: "google", label: "Google Search", emoji: "🔍", why: "Căutări de soluții B2B — directori și manageri caută activ" },
      { id: "research_website", label: "Analiză website competitori", emoji: "🌐", why: "Mesajele de marketing ale competitorilor" },
      { id: "reddit", label: "Reddit", emoji: "🟠", why: "r/entrepreneur, r/smallbusiness — decision makers activi" },
    ],
    channels: [
      { channelId: "email", emoji: "📧", label: "Email", priority: "must", why: "Cold email B2B = cel mai direct canal spre decision makers", services: [EXT.hunter, EXT.apollo, EXT.brevo, EXT.mailchimp] },
      { channelId: "landing_page", emoji: "🌐", label: "Landing Page", priority: "must", why: "Case study + ROI calculator + formular demo = convertor B2B", services: [EXT.webflow, EXT.carrd, EXT.typeform] },
      { channelId: "video_brief", emoji: "🎬", label: "Brief Video", priority: "recommended", why: "Demo video sau case study video = proof of concept puternic", services: [EXT.capcut, EXT.canva] },
      { channelId: "facebook_post", emoji: "👥", label: "Facebook Post", priority: "recommended", why: "Grupuri de antreprenori și reclame B2B targetate", services: [EXT.buffer, EXT.metaads] },
      { channelId: "sms", emoji: "📱", label: "SMS", priority: "optional", why: "Follow-up rapid după email sau eveniment", services: [EXT.textmagic] },
      { channelId: "instagram_post", emoji: "📸", label: "Instagram", priority: "optional", why: "Brand credibility și team culture", services: [EXT.later, EXT.canva] },
    ],
    adjacentHints: [EXT.hunter, EXT.apollo, EXT.linkedin, EXT.gads, EXT.hotjar, EXT.zapier, EXT.make],
  },
  physical_product: {
    label: "Produs fizic",
    topChannels: ["instagram_post", "tiktok", "facebook_post", "email", "video_brief", "landing_page"],
    researchSources: [
      { id: "instagram_hashtag", label: "Instagram", emoji: "📸", why: "Produse fizice — nișa vizuală principală" },
      { id: "reddit", label: "Reddit", emoji: "🟠", why: "Review-uri și comunități de pasionați pe nișa produsului" },
      { id: "google", label: "Google Search", emoji: "🔍", why: "Căutări de produs + comparații + review-uri" },
    ],
    channels: [
      { channelId: "instagram_post", emoji: "📸", label: "Instagram", priority: "must", why: "Showcase vizual de produs — carousel, reel, story cu link", services: [EXT.fbshops, EXT.later, EXT.canva] },
      { channelId: "tiktok", emoji: "🎵", label: "TikTok", priority: "must", why: "Product showcase, unboxing și review — TikTok Shop crește rapid", services: [EXT.capcut, EXT.tiktokads] },
      { channelId: "video_brief", emoji: "🎬", label: "Brief Video", priority: "must", why: "Demonstrație produs = conversion rate +300%", services: [EXT.capcut, EXT.canva] },
      { channelId: "facebook_post", emoji: "👥", label: "Facebook Post", priority: "recommended", why: "Catalog Facebook Shops + reclame retargeting", services: [EXT.metaads, EXT.fbshops, EXT.buffer] },
      { channelId: "email", emoji: "📧", label: "Email", priority: "recommended", why: "Launch + restock notifications pentru lista de abonați", services: [EXT.mailchimp, EXT.brevo] },
      { channelId: "landing_page", emoji: "🌐", label: "Landing Page", priority: "optional", why: "Pagina de produs cu specs + reviews + checkout", services: [EXT.shopify, EXT.carrd] },
    ],
    adjacentHints: [EXT.shopify, EXT.woo, EXT.fbshops, EXT.gads, EXT.metapixel, EXT.ga4, EXT.canva],
  },
};

// ── Sub-components ────────────────────────────────────────────────────────────
const CATEGORY_META: Record<Category, { label: string; color: string }> = {
  social:      { label: "Social Media",   color: "#3B82F6" },
  outreach:    { label: "Outreach",       color: "#F59E0B" },
  marketplace: { label: "Marketplace",    color: "#10B981" },
  analytics:   { label: "Analytics",      color: "#8B5CF6" },
  automation:  { label: "Automatizare",   color: "#EC4899" },
  creation:    { label: "Creare conținut",color: "#F97316" },
};

const PRIORITY_META: Record<Priority, { label: string; color: string; bg: string }> = {
  must:        { label: "Esențial",       color: "#1DB954", bg: "rgba(29,185,84,0.1)"  },
  recommended: { label: "Recomandat",     color: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
  optional:    { label: "Opțional",       color: "#94A3B8", bg: "rgba(148,163,184,0.1)"},
};

function ServiceCard({ svc }: { svc: ExtService }) {
  const cat = CATEGORY_META[svc.category];
  return (
    <div className="flex items-start gap-2 p-2 rounded-lg"
      style={{ backgroundColor: "rgba(245,215,160,0.04)", border: "1px solid rgba(245,215,160,0.12)" }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold" style={{ color: "#292524" }}>{svc.name}</span>
          {svc.free && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
              style={{ backgroundColor: "rgba(29,185,84,0.12)", color: GREEN }}>GRATUIT</span>
          )}
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: `${cat.color}12`, color: cat.color }}>
            {cat.label}
          </span>
        </div>
        <p className="text-[11px] mt-0.5" style={{ color: "#A8967E" }}>{svc.desc}</p>
        <p className="text-[10px] mt-0.5 font-mono" style={{ color: "#C4A882" }}>{svc.domain}</p>
      </div>
    </div>
  );
}

interface ChannelRowProps {
  ch: ChannelRec;
  isTop: boolean;
}

function ChannelRow({ ch, isTop }: ChannelRowProps) {
  const [open, setOpen] = useState(isTop);
  const pm = PRIORITY_META[ch.priority];
  return (
    <div className="rounded-xl overflow-hidden"
      style={{ border: `1px solid ${pm.color}25`, backgroundColor: `${pm.color}04` }}>
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left">
        <div className="flex items-center gap-2">
          <span className="text-base">{ch.emoji}</span>
          <span className="text-sm font-bold" style={{ color: "#292524" }}>{ch.label}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
            style={{ backgroundColor: pm.bg, color: pm.color }}>
            {pm.label}
          </span>
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5" style={{ color: "#A8967E" }} />
               : <ChevronDown className="w-3.5 h-3.5" style={{ color: "#A8967E" }} />}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          <p className="text-xs" style={{ color: "#78614E" }}>{ch.why}</p>
          {ch.services.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#A8967E" }}>Instrumente recomandate</p>
              <div className="grid grid-cols-1 gap-1.5">
                {ch.services.map(s => <ServiceCard key={s.name} svc={s} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  offerType: string;
}

export default function AdjacentServicesPanel({ offerType }: Props) {
  const [tab, setTab] = useState<"channels" | "sources" | "hints">("channels");
  const [open, setOpen] = useState(true);

  const cfg = CONFIGS[offerType] ?? CONFIGS["service"];

  // Group adjacent hints by category
  const hintsByCategory = cfg.adjacentHints.reduce<Record<Category, ExtService[]>>((acc, svc) => {
    if (!acc[svc.category]) acc[svc.category] = [];
    acc[svc.category].push(svc);
    return acc;
  }, {} as Record<Category, ExtService[]>);

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid rgba(245,215,160,0.2)", backgroundColor: "#FFFCF7" }}>

      {/* Header */}
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-500/5 transition-all">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4" style={{ color: AMBER }} />
          <div className="text-left">
            <p className="text-sm font-bold" style={{ color: "#292524" }}>
              Servicii adiacente recomandate
            </p>
            <p className="text-xs" style={{ color: "#A8967E" }}>
              Adaptate pentru: <strong style={{ color: AMBER }}>{cfg.label}</strong>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-1 rounded-lg font-bold"
            style={{ backgroundColor: `${AMBER}15`, color: AMBER }}>
            {cfg.channels.length} canale • {cfg.adjacentHints.length} instrumente
          </span>
          {open ? <ChevronUp className="w-4 h-4" style={{ color: "#A8967E" }} />
                : <ChevronDown className="w-4 h-4" style={{ color: "#A8967E" }} />}
        </div>
      </button>

      {open && (
        <div className="border-t" style={{ borderColor: "rgba(245,215,160,0.15)" }}>
          {/* Tabs */}
          <div className="flex gap-1 p-3 pb-0">
            {[
              { id: "channels", label: "📡 Canale prioritare" },
              { id: "sources",  label: "🔍 Surse research" },
              { id: "hints",    label: "🛠️ Instrumente externe" },
            ].map(t => (
              <button key={t.id} type="button"
                onClick={() => setTab(t.id as typeof tab)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{
                  backgroundColor: tab === t.id ? AMBER : "transparent",
                  color: tab === t.id ? "#1C1814" : "#A8967E",
                  border: `1px solid ${tab === t.id ? AMBER : "rgba(245,215,160,0.2)"}`,
                }}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-3 space-y-2">

            {/* ── Tab: Channels ── */}
            {tab === "channels" && (
              <div className="space-y-2">
                <p className="text-xs" style={{ color: "#A8967E" }}>
                  Ordinea priorităților pentru <strong style={{ color: "#78614E" }}>{cfg.label}</strong> — canale esențiale marcate cu verde
                </p>
                {cfg.channels
                  .sort((a, b) => {
                    const order = { must: 0, recommended: 1, optional: 2 };
                    return order[a.priority] - order[b.priority];
                  })
                  .map((ch, i) => (
                    <ChannelRow key={ch.channelId} ch={ch} isTop={i < 2} />
                  ))}
              </div>
            )}

            {/* ── Tab: Research sources ── */}
            {tab === "sources" && (
              <div className="space-y-2">
                <p className="text-xs" style={{ color: "#A8967E" }}>
                  Sursele de research cele mai eficiente pentru acest tip de campanie
                </p>
                {cfg.researchSources.map(src => (
                  <div key={src.id} className="flex items-start gap-3 p-3 rounded-xl"
                    style={{ backgroundColor: "rgba(245,215,160,0.05)", border: "1px solid rgba(245,215,160,0.15)" }}>
                    <span className="text-lg">{src.emoji}</span>
                    <div>
                      <p className="text-sm font-bold" style={{ color: "#292524" }}>{src.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#78614E" }}>{src.why}</p>
                    </div>
                    <Star className="w-3.5 h-3.5 mt-0.5 ml-auto flex-shrink-0" style={{ color: AMBER }} />
                  </div>
                ))}
                <div className="rounded-xl p-3"
                  style={{ backgroundColor: "rgba(29,185,84,0.05)", border: "1px solid rgba(29,185,84,0.15)" }}>
                  <p className="text-xs font-bold" style={{ color: GREEN }}>💡 Sfat Research</p>
                  <p className="text-xs mt-1" style={{ color: "#78614E" }}>
                    Activează sursele recomandate în Pasul 3 al wizardului pentru cele mai bune rezultate pe tipul tău de campanie.
                  </p>
                </div>
              </div>
            )}

            {/* ── Tab: External hints ── */}
            {tab === "hints" && (
              <div className="space-y-3">
                <p className="text-xs" style={{ color: "#A8967E" }}>
                  Instrumente externe pe care le poți combina cu platforma pentru campanii complete
                </p>
                {Object.entries(hintsByCategory).map(([cat, svcs]) => {
                  const cm = CATEGORY_META[cat as Category];
                  return (
                    <div key={cat}>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5"
                        style={{ color: cm.color }}>
                        {cm.label}
                      </p>
                      <div className="space-y-1.5">
                        {svcs.map(s => <ServiceCard key={s.name} svc={s} />)}
                      </div>
                    </div>
                  );
                })}
                <div className="rounded-xl p-3"
                  style={{ backgroundColor: `${PURPLE}08`, border: `1px solid ${PURPLE}20` }}>
                  <p className="text-xs font-bold" style={{ color: PURPLE }}>🔌 Integrări viitoare</p>
                  <p className="text-xs mt-1" style={{ color: "#78614E" }}>
                    Platforma va integra direct trimiterea SMS, Email și postare social media fără a părăsi aplicația. În curând disponibil.
                  </p>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
