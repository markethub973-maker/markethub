"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Zap, Star } from "lucide-react";

const AMBER = "var(--color-primary)";
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
  twilio:      { name: "Twilio",         desc: "Programmatic SMS & WhatsApp API",         domain: "twilio.com",            category: "outreach",     free: false },
  textmagic:   { name: "TextMagic",      desc: "Bulk SMS sending",                        domain: "textmagic.com",         category: "outreach",     free: false },
  buffer:      { name: "Buffer",         desc: "Social media post scheduling",            domain: "buffer.com",            category: "automation",   free: true  },
  hootsuite:   { name: "Hootsuite",      desc: "Multi-channel social media management",   domain: "hootsuite.com",         category: "automation",   free: false },
  later:       { name: "Later",          desc: "Visual planning for Instagram/TikTok",    domain: "later.com",             category: "automation",   free: true  },
  canva:       { name: "Canva",          desc: "Fast design for posts, stories, banners", domain: "canva.com",             category: "creation",     free: true  },
  capcut:      { name: "CapCut",         desc: "Native TikTok/Reel video editing",        domain: "capcut.com",            category: "creation",     free: true  },
  carrd:       { name: "Carrd",          desc: "Simple landing page in <30 min",          domain: "carrd.co",              category: "creation",     free: true  },
  webflow:     { name: "Webflow",        desc: "Professional no-code landing page",       domain: "webflow.com",           category: "creation",     free: true  },
  ga4:         { name: "Google Analytics 4", desc: "Traffic and conversion tracking",     domain: "analytics.google.com",  category: "analytics",    free: true  },
  hotjar:      { name: "Hotjar",         desc: "Heatmaps and session recordings",         domain: "hotjar.com",            category: "analytics",    free: true  },
  metapixel:   { name: "Meta Pixel",     desc: "Facebook/Instagram ads tracking",         domain: "business.facebook.com", category: "analytics",    free: true  },
  gbusiness:   { name: "Google Business", desc: "Google Maps profile for local businesses", domain: "business.google.com", category: "marketplace",  free: true  },
  glovo:       { name: "Glovo",          desc: "Restaurant/store listing for deliveries", domain: "glovo.com",             category: "marketplace",  free: false },
  tazz:        { name: "Tazz",           desc: "Food delivery (Romania)",                 domain: "tazz.ro",               category: "marketplace",  free: false },
  boltfood:    { name: "Bolt Food",      desc: "Alternative food delivery",               domain: "food.bolt.eu",          category: "marketplace",  free: false },
  tripadvisor: { name: "TripAdvisor",    desc: "Restaurant reviews & visibility",         domain: "tripadvisor.com",       category: "marketplace",  free: true  },
  shopify:     { name: "Shopify",        desc: "All-in-one online store",                 domain: "shopify.com",           category: "marketplace",  free: false },
  woo:         { name: "WooCommerce",    desc: "eCommerce on WordPress",                  domain: "woocommerce.com",       category: "marketplace",  free: true  },
  fbshops:     { name: "Facebook Shops", desc: "Product catalog on Facebook/Instagram",   domain: "business.facebook.com", category: "social",       free: true  },
  gads:        { name: "Google Ads",     desc: "Google Search & Display ads",             domain: "ads.google.com",        category: "outreach",     free: false },
  metaads:     { name: "Meta Ads",       desc: "Facebook & Instagram ads",                domain: "business.facebook.com", category: "outreach",     free: false },
  tiktokads:   { name: "TikTok Ads",     desc: "TikTok for Business ads",                 domain: "ads.tiktok.com",        category: "outreach",     free: false },
  linkedin:    { name: "LinkedIn Ads",   desc: "Precise B2B targeting by role/industry",  domain: "business.linkedin.com", category: "outreach",     free: false },
  hunter:      { name: "Hunter.io",      desc: "B2B business email finder",               domain: "hunter.io",             category: "outreach",     free: true  },
  apollo:      { name: "Apollo.io",      desc: "B2B prospecting + email outreach",        domain: "apollo.io",             category: "outreach",     free: true  },
  imobiliare:  { name: "Imobiliare.ro",  desc: "Property listings (Romanian market)",     domain: "imobiliare.ro",         category: "marketplace",  free: false },
  storia:      { name: "Storia.ro",      desc: "Alternative real estate platform",        domain: "storia.ro",             category: "marketplace",  free: false },
  olx:         { name: "OLX",            desc: "General marketplace + real estate",       domain: "olx.ro",                category: "marketplace",  free: true  },
  udemy:       { name: "Udemy",          desc: "Publish courses for a global audience",   domain: "udemy.com",             category: "marketplace",  free: false },
  teachable:   { name: "Teachable",      desc: "Course platform with your own branding",  domain: "teachable.com",         category: "marketplace",  free: true  },
  performant:  { name: "2Performant",    desc: "Affiliate network (Romania)",             domain: "2performant.com",       category: "marketplace",  free: false },
  admitad:     { name: "Admitad",        desc: "Affiliate network (Europe)",              domain: "admitad.com",           category: "marketplace",  free: false },
  fresha:      { name: "Fresha",         desc: "Salon/spa booking with no commission",    domain: "fresha.com",            category: "marketplace",  free: true  },
  booksy:      { name: "Booksy",         desc: "Beauty & wellness bookings",              domain: "booksy.com",            category: "marketplace",  free: false },
  typeform:    { name: "Typeform",       desc: "Interactive forms & lead magnets",        domain: "typeform.com",          category: "creation",     free: true  },
  zapier:      { name: "Zapier",         desc: "No-code automation between platforms",    domain: "zapier.com",            category: "automation",   free: true  },
  make:        { name: "Make",           desc: "Advanced visual automation (formerly Integromat)", domain: "make.com",     category: "automation",   free: true  },
};

// ── Per-offer-type config ─────────────────────────────────────────────────────
const CONFIGS: Record<string, OfferConfig> = {
  service: {
    label: "Local service",
    topChannels: ["whatsapp", "sms", "facebook_post", "instagram_post", "email", "landing_page"],
    researchSources: [
      { id: "google_maps", label: "Google Maps", emoji: "🗺️", why: "Customers look up services on Maps before anything else" },
      { id: "facebook_groups", label: "Facebook Groups", emoji: "👥", why: "Local groups where people ask for service recommendations" },
      { id: "google", label: "Google Search", emoji: "🔍", why: "Active 'service + city' searches" },
    ],
    channels: [
      { channelId: "whatsapp", emoji: "💬", label: "WhatsApp", priority: "must", why: "Local customers prefer WhatsApp for services — fast reply, high conversion", services: [EXT.brevo, EXT.twilio] },
      { channelId: "sms", emoji: "📱", label: "SMS", priority: "must", why: "Direct reach with 98% open rate — ideal for booking confirmations", services: [EXT.textmagic, EXT.brevo] },
      { channelId: "facebook_post", emoji: "👥", label: "Facebook Post", priority: "recommended", why: "Local neighborhood groups — the most organic source for services", services: [EXT.buffer, EXT.canva] },
      { channelId: "landing_page", emoji: "🌐", label: "Landing Page", priority: "recommended", why: "The page where you send traffic from every channel", services: [EXT.carrd, EXT.typeform] },
      { channelId: "instagram_post", emoji: "📸", label: "Instagram", priority: "optional", why: "Brand awareness — before/after posts if the service is visual", services: [EXT.later, EXT.canva] },
      { channelId: "email", emoji: "📧", label: "Email", priority: "optional", why: "Newsletter for recurring customers", services: [EXT.mailchimp, EXT.brevo] },
    ],
    adjacentHints: [EXT.gbusiness, EXT.canva, EXT.zapier, EXT.ga4, EXT.typeform],
  },
  event_entertain: {
    label: "Events & Entertainment",
    topChannels: ["instagram_post", "facebook_post", "video_brief", "photo_brief", "whatsapp", "landing_page"],
    researchSources: [
      { id: "facebook_groups", label: "Facebook Groups", emoji: "👥", why: "Wedding, baptism and corporate event groups" },
      { id: "instagram_hashtag", label: "Instagram Hashtags", emoji: "📸", why: "Local event hashtags + visual trends" },
      { id: "google", label: "Google Search", emoji: "🔍", why: "Searches like 'wedding DJ', 'baptism photographer' + city" },
    ],
    channels: [
      { channelId: "instagram_post", emoji: "📸", label: "Instagram", priority: "must", why: "The events industry lives on Instagram — a visual portfolio converts directly", services: [EXT.later, EXT.canva, EXT.capcut] },
      { channelId: "video_brief", emoji: "🎬", label: "Video Brief", priority: "must", why: "Event videos = the strongest social proof", services: [EXT.capcut, EXT.canva] },
      { channelId: "photo_brief", emoji: "📷", label: "Photo Brief", priority: "must", why: "Photo portfolio = first impression for clients", services: [EXT.canva] },
      { channelId: "facebook_post", emoji: "👥", label: "Facebook Post", priority: "recommended", why: "Wedding/baptism groups — recommendations spread fast", services: [EXT.buffer] },
      { channelId: "whatsapp", emoji: "💬", label: "WhatsApp", priority: "recommended", why: "Quick follow-up after first contact and confirmations", services: [EXT.brevo, EXT.twilio] },
      { channelId: "landing_page", emoji: "🌐", label: "Landing Page", priority: "recommended", why: "Portfolio + booking form = max conversion", services: [EXT.carrd, EXT.typeform] },
    ],
    adjacentHints: [EXT.canva, EXT.capcut, EXT.later, EXT.gbusiness, EXT.metaads, EXT.ga4],
  },
  food_beverage: {
    label: "Food & Beverages",
    topChannels: ["whatsapp", "instagram_post", "facebook_post", "sms", "tiktok", "landing_page"],
    researchSources: [
      { id: "google_maps", label: "Google Maps", emoji: "🗺️", why: "Main source for restaurants — reviews and location" },
      { id: "reviews", label: "Maps Reviews", emoji: "⭐", why: "Reviews are the #1 factor in choosing a restaurant" },
      { id: "facebook_groups", label: "Facebook Groups", emoji: "👥", why: "Foodie groups and local recommendations" },
    ],
    channels: [
      { channelId: "instagram_post", emoji: "📸", label: "Instagram", priority: "must", why: "Food content = the highest engagement on Instagram — photogenic food goes viral fast", services: [EXT.later, EXT.canva, EXT.capcut] },
      { channelId: "whatsapp", emoji: "💬", label: "WhatsApp", priority: "must", why: "Quick orders and bookings — loyal customers prefer WhatsApp", services: [EXT.brevo, EXT.twilio] },
      { channelId: "tiktok", emoji: "🎵", label: "TikTok/Reel", priority: "must", why: "Food TikToks have huge viral rates — ASMR cooking, behind the scenes, reviews", services: [EXT.capcut, EXT.tiktokads] },
      { channelId: "facebook_post", emoji: "👥", label: "Facebook Post", priority: "recommended", why: "Mature local audience — daily specials, menus, offers", services: [EXT.buffer, EXT.canva] },
      { channelId: "sms", emoji: "📱", label: "SMS", priority: "recommended", why: "Daily promo notifications for loyal customers", services: [EXT.textmagic] },
      { channelId: "landing_page", emoji: "🌐", label: "Landing Page", priority: "optional", why: "Online menu + reservations — essential for a modern restaurant", services: [EXT.carrd, EXT.typeform] },
    ],
    adjacentHints: [EXT.glovo, EXT.tazz, EXT.boltfood, EXT.gbusiness, EXT.tripadvisor, EXT.metapixel],
  },
  ecommerce: {
    label: "Online store",
    topChannels: ["instagram_post", "facebook_post", "email", "tiktok", "sms", "landing_page"],
    researchSources: [
      { id: "google", label: "Google Search", emoji: "🔍", why: "Clear purchase intent — product searches + comparisons" },
      { id: "reddit", label: "Reddit", emoji: "🟠", why: "Authentic reviews and enthusiast communities" },
      { id: "instagram_hashtag", label: "Instagram Hashtags", emoji: "📸", why: "Competitors and product trends" },
    ],
    channels: [
      { channelId: "instagram_post", emoji: "📸", label: "Instagram", priority: "must", why: "Shopping on Instagram directly from posts — visual catalog with product link", services: [EXT.fbshops, EXT.later, EXT.canva] },
      { channelId: "facebook_post", emoji: "👥", label: "Facebook Post", priority: "must", why: "Largest audience for retargeting ads and flash offers", services: [EXT.metaads, EXT.metapixel, EXT.buffer] },
      { channelId: "email", emoji: "📧", label: "Email", priority: "must", why: "Newsletter + abandoned cart = the most profitable channel in eCommerce", services: [EXT.mailchimp, EXT.brevo] },
      { channelId: "tiktok", emoji: "🎵", label: "TikTok", priority: "recommended", why: "Viral product unboxing and reviews — TikTok Shop is growing fast", services: [EXT.tiktokads, EXT.capcut] },
      { channelId: "sms", emoji: "📱", label: "SMS", priority: "recommended", why: "Flash sales and restocks — instant open rate", services: [EXT.textmagic, EXT.brevo] },
      { channelId: "landing_page", emoji: "🌐", label: "Landing Page", priority: "recommended", why: "Dedicated page per product/collection for ad campaigns", services: [EXT.carrd, EXT.webflow] },
    ],
    adjacentHints: [EXT.shopify, EXT.woo, EXT.fbshops, EXT.gads, EXT.ga4, EXT.hotjar, EXT.zapier],
  },
  affiliate: {
    label: "Affiliate",
    topChannels: ["instagram_post", "tiktok", "facebook_post", "email", "landing_page", "video_brief"],
    researchSources: [
      { id: "reddit", label: "Reddit", emoji: "🟠", why: "Authentic review subreddits — audiences look for real opinions" },
      { id: "google", label: "Google Search", emoji: "🔍", why: "Searches like 'best X', 'X review' — pre-purchase intent" },
      { id: "instagram_hashtag", label: "Instagram", emoji: "📸", why: "Affiliate influencers and product trends" },
    ],
    channels: [
      { channelId: "instagram_post", emoji: "📸", label: "Instagram", priority: "must", why: "Link in bio + Stories with swipe-up = main affiliate converter", services: [EXT.later, EXT.canva, EXT.metaads] },
      { channelId: "tiktok", emoji: "🎵", label: "TikTok/Reel", priority: "must", why: "Authentic reviews and unboxing — TikTok Shop pays affiliates per sale", services: [EXT.capcut, EXT.tiktokads] },
      { channelId: "video_brief", emoji: "🎬", label: "Video Brief", priority: "must", why: "YouTube reviews = organic traffic for years — most profitable for affiliates", services: [EXT.capcut, EXT.canva] },
      { channelId: "email", emoji: "📧", label: "Email", priority: "recommended", why: "Email list = your #1 asset — it doesn't depend on algorithms", services: [EXT.mailchimp, EXT.brevo] },
      { channelId: "landing_page", emoji: "🌐", label: "Landing Page", priority: "recommended", why: "Review page + affiliate link = main conversion page", services: [EXT.carrd, EXT.webflow, EXT.typeform] },
      { channelId: "facebook_post", emoji: "👥", label: "Facebook Post", priority: "optional", why: "Enthusiast groups + retargeting ads", services: [EXT.buffer, EXT.metaads] },
    ],
    adjacentHints: [EXT.performant, EXT.admitad, EXT.ga4, EXT.hotjar, EXT.canva, EXT.zapier],
  },
  software: {
    label: "Software / App",
    topChannels: ["email", "landing_page", "instagram_post", "facebook_post", "tiktok", "video_brief"],
    researchSources: [
      { id: "reddit", label: "Reddit", emoji: "🟠", why: "Tech communities and authentic reviews — r/SaaS, r/entrepreneur" },
      { id: "google", label: "Google Search", emoji: "🔍", why: "Searches for alternatives + comparison reviews" },
      { id: "research_website", label: "Competitor analysis", emoji: "🌐", why: "Marketing messages of your competitors" },
    ],
    channels: [
      { channelId: "email", emoji: "📧", label: "Email", priority: "must", why: "Onboarding sequences + product updates = SaaS retention", services: [EXT.mailchimp, EXT.brevo] },
      { channelId: "landing_page", emoji: "🌐", label: "Landing Page", priority: "must", why: "Main conversion page — headline + demo + pricing", services: [EXT.webflow, EXT.carrd, EXT.typeform] },
      { channelId: "video_brief", emoji: "🎬", label: "Video Brief", priority: "must", why: "Demo video = the most powerful conversion element for SaaS", services: [EXT.canva, EXT.capcut] },
      { channelId: "instagram_post", emoji: "📸", label: "Instagram", priority: "recommended", why: "UI screenshots + product updates + behind-the-scenes building", services: [EXT.later, EXT.canva] },
      { channelId: "facebook_post", emoji: "👥", label: "Facebook Post", priority: "recommended", why: "Entrepreneur groups and specific niche communities", services: [EXT.buffer, EXT.metaads] },
      { channelId: "tiktok", emoji: "🎵", label: "TikTok", priority: "optional", why: "Short product demos + tips & tricks — young tech audience", services: [EXT.capcut, EXT.tiktokads] },
    ],
    adjacentHints: [EXT.ga4, EXT.hotjar, EXT.typeform, EXT.zapier, EXT.make, EXT.gads],
  },
  digital_product: {
    label: "Digital product",
    topChannels: ["instagram_post", "email", "tiktok", "landing_page", "facebook_post", "video_brief"],
    researchSources: [
      { id: "instagram_hashtag", label: "Instagram", emoji: "📸", why: "Communities of creators and digital product buyers" },
      { id: "reddit", label: "Reddit", emoji: "🟠", why: "Niche subreddits where your audience hangs out" },
      { id: "google", label: "Google Search", emoji: "🔍", why: "Searches for tips, tutorials and templates in your niche" },
    ],
    channels: [
      { channelId: "instagram_post", emoji: "📸", label: "Instagram", priority: "must", why: "Preview pages, results screenshots, testimonials — main converter for creators", services: [EXT.later, EXT.canva] },
      { channelId: "email", emoji: "📧", label: "Email", priority: "must", why: "Your list = your distributor — launch sequence + freebie lead magnet", services: [EXT.mailchimp, EXT.brevo] },
      { channelId: "tiktok", emoji: "🎵", label: "TikTok", priority: "recommended", why: "Free tips that lead to your product — 'part 1 of 3'", services: [EXT.capcut, EXT.tiktokads] },
      { channelId: "landing_page", emoji: "🌐", label: "Landing Page", priority: "recommended", why: "Sales page with testimonials + preview + offer", services: [EXT.carrd, EXT.webflow, EXT.typeform] },
      { channelId: "facebook_post", emoji: "👥", label: "Facebook", priority: "optional", why: "Niche groups and retargeting ads", services: [EXT.buffer, EXT.metaads] },
      { channelId: "video_brief", emoji: "🎬", label: "Video Brief", priority: "optional", why: "YouTube tutorial that demonstrates the product's value", services: [EXT.capcut, EXT.canva] },
    ],
    adjacentHints: [EXT.teachable, EXT.udemy, EXT.gads, EXT.metapixel, EXT.hotjar, EXT.zapier],
  },
  health_beauty: {
    label: "Health & Beauty",
    topChannels: ["instagram_post", "tiktok", "facebook_post", "whatsapp", "video_brief", "landing_page"],
    researchSources: [
      { id: "instagram_hashtag", label: "Instagram Hashtags", emoji: "📸", why: "Beauty content = the #1 niche on Instagram — competition and inspiration" },
      { id: "google_maps", label: "Google Maps", emoji: "🗺️", why: "Local searches for 'salon', 'spa', 'cosmetics' + reviews" },
      { id: "tiktok_hashtag", label: "TikTok", emoji: "🎵", why: "BeautyTok — viral trends and tutorials" },
    ],
    channels: [
      { channelId: "instagram_post", emoji: "📸", label: "Instagram", priority: "must", why: "Before/after, tutorials, products — beauty is native to Instagram", services: [EXT.later, EXT.canva, EXT.capcut] },
      { channelId: "tiktok", emoji: "🎵", label: "TikTok/Reel", priority: "must", why: "BeautyTok — short product tutorials = thousands of organic views", services: [EXT.capcut, EXT.tiktokads] },
      { channelId: "video_brief", emoji: "🎬", label: "Video Brief", priority: "must", why: "Full product usage tutorial or salon procedure walkthrough", services: [EXT.capcut, EXT.canva] },
      { channelId: "facebook_post", emoji: "👥", label: "Facebook Post", priority: "recommended", why: "Promotions and the more mature local audience for salon services", services: [EXT.buffer, EXT.metaads] },
      { channelId: "whatsapp", emoji: "💬", label: "WhatsApp", priority: "recommended", why: "Quick bookings and follow-ups with loyal clients", services: [EXT.brevo, EXT.twilio] },
      { channelId: "landing_page", emoji: "🌐", label: "Landing Page", priority: "optional", why: "Online booking + service portfolio + pricing", services: [EXT.carrd, EXT.typeform] },
    ],
    adjacentHints: [EXT.fresha, EXT.booksy, EXT.gbusiness, EXT.canva, EXT.metapixel, EXT.ga4],
  },
  real_estate: {
    label: "Real Estate",
    topChannels: ["facebook_post", "instagram_post", "email", "video_brief", "photo_brief", "landing_page"],
    researchSources: [
      { id: "google", label: "Google Search", emoji: "🔍", why: "Active property searches — high buy/rent intent" },
      { id: "google_maps", label: "Google Maps", emoji: "🗺️", why: "Property location and reference area" },
      { id: "facebook_groups", label: "Facebook Groups", emoji: "👥", why: "Local real estate groups — the most active channel for transactions" },
    ],
    channels: [
      { channelId: "facebook_post", emoji: "👥", label: "Facebook Post", priority: "must", why: "Local real estate groups = the #1 source of organic leads", services: [EXT.buffer, EXT.metaads, EXT.canva] },
      { channelId: "photo_brief", emoji: "📷", label: "Photo Brief", priority: "must", why: "Professional property photography = the difference between a sale and stagnation", services: [EXT.canva] },
      { channelId: "video_brief", emoji: "🎬", label: "Video Brief", priority: "must", why: "Virtual tour videos = more views, more qualified clients", services: [EXT.capcut, EXT.canva] },
      { channelId: "email", emoji: "📧", label: "Email", priority: "recommended", why: "Newsletter with new listings for the prospect database", services: [EXT.mailchimp, EXT.brevo] },
      { channelId: "instagram_post", emoji: "📸", label: "Instagram", priority: "recommended", why: "Premium property showcases and agency branding", services: [EXT.later, EXT.canva] },
      { channelId: "landing_page", emoji: "🌐", label: "Landing Page", priority: "optional", why: "Dedicated property page with gallery + contact form", services: [EXT.carrd, EXT.webflow, EXT.typeform] },
    ],
    adjacentHints: [EXT.imobiliare, EXT.storia, EXT.olx, EXT.gads, EXT.ga4, EXT.canva],
  },
  education: {
    label: "Education & Courses",
    topChannels: ["email", "landing_page", "instagram_post", "tiktok", "facebook_post", "video_brief"],
    researchSources: [
      { id: "google", label: "Google Search", emoji: "🔍", why: "Searches for 'X course', 'how to learn X' — educational intent" },
      { id: "facebook_groups", label: "Facebook Groups", emoji: "👥", why: "Student communities and professional development groups" },
      { id: "reddit", label: "Reddit", emoji: "🟠", why: "Learning subreddits + the course's niche" },
    ],
    channels: [
      { channelId: "email", emoji: "📧", label: "Email", priority: "must", why: "Long nurturing sequence — students decide slowly, email builds trust", services: [EXT.mailchimp, EXT.brevo] },
      { channelId: "landing_page", emoji: "🌐", label: "Landing Page", priority: "must", why: "Enrollment page with curriculum, testimonials and guarantee", services: [EXT.webflow, EXT.carrd, EXT.typeform] },
      { channelId: "video_brief", emoji: "🎬", label: "Video Brief", priority: "must", why: "Free preview lesson = the strongest converter for courses", services: [EXT.capcut, EXT.canva] },
      { channelId: "instagram_post", emoji: "📸", label: "Instagram", priority: "recommended", why: "Free educational tips that build the audience", services: [EXT.later, EXT.canva] },
      { channelId: "tiktok", emoji: "🎵", label: "TikTok", priority: "recommended", why: "60s micro-lessons — EdTok is growing massively", services: [EXT.capcut, EXT.tiktokads] },
      { channelId: "facebook_post", emoji: "👥", label: "Facebook Post", priority: "optional", why: "Niche groups and ads targeted by occupation/age", services: [EXT.buffer, EXT.metaads] },
    ],
    adjacentHints: [EXT.teachable, EXT.udemy, EXT.typeform, EXT.zapier, EXT.ga4, EXT.metapixel],
  },
  b2b_services: {
    label: "B2B Services",
    topChannels: ["email", "linkedin", "landing_page", "facebook_post", "video_brief", "sms"],
    researchSources: [
      { id: "google", label: "Google Search", emoji: "🔍", why: "B2B solution searches — directors and managers actively look" },
      { id: "research_website", label: "Competitor website analysis", emoji: "🌐", why: "Marketing messages of competitors" },
      { id: "reddit", label: "Reddit", emoji: "🟠", why: "r/entrepreneur, r/smallbusiness — active decision makers" },
    ],
    channels: [
      { channelId: "email", emoji: "📧", label: "Email", priority: "must", why: "B2B cold email = the most direct channel to decision makers", services: [EXT.hunter, EXT.apollo, EXT.brevo, EXT.mailchimp] },
      { channelId: "landing_page", emoji: "🌐", label: "Landing Page", priority: "must", why: "Case study + ROI calculator + demo form = B2B converter", services: [EXT.webflow, EXT.carrd, EXT.typeform] },
      { channelId: "video_brief", emoji: "🎬", label: "Video Brief", priority: "recommended", why: "Demo video or case study video = strong proof of concept", services: [EXT.capcut, EXT.canva] },
      { channelId: "facebook_post", emoji: "👥", label: "Facebook Post", priority: "recommended", why: "Entrepreneur groups and B2B targeted ads", services: [EXT.buffer, EXT.metaads] },
      { channelId: "sms", emoji: "📱", label: "SMS", priority: "optional", why: "Quick follow-up after email or event", services: [EXT.textmagic] },
      { channelId: "instagram_post", emoji: "📸", label: "Instagram", priority: "optional", why: "Brand credibility and team culture", services: [EXT.later, EXT.canva] },
    ],
    adjacentHints: [EXT.hunter, EXT.apollo, EXT.linkedin, EXT.gads, EXT.hotjar, EXT.zapier, EXT.make],
  },
  physical_product: {
    label: "Physical product",
    topChannels: ["instagram_post", "tiktok", "facebook_post", "email", "video_brief", "landing_page"],
    researchSources: [
      { id: "instagram_hashtag", label: "Instagram", emoji: "📸", why: "Physical products — primary visual niche" },
      { id: "reddit", label: "Reddit", emoji: "🟠", why: "Reviews and enthusiast communities for the product niche" },
      { id: "google", label: "Google Search", emoji: "🔍", why: "Product searches + comparisons + reviews" },
    ],
    channels: [
      { channelId: "instagram_post", emoji: "📸", label: "Instagram", priority: "must", why: "Visual product showcase — carousel, reel, story with link", services: [EXT.fbshops, EXT.later, EXT.canva] },
      { channelId: "tiktok", emoji: "🎵", label: "TikTok", priority: "must", why: "Product showcase, unboxing and reviews — TikTok Shop is growing fast", services: [EXT.capcut, EXT.tiktokads] },
      { channelId: "video_brief", emoji: "🎬", label: "Video Brief", priority: "must", why: "Product demonstration = +300% conversion rate", services: [EXT.capcut, EXT.canva] },
      { channelId: "facebook_post", emoji: "👥", label: "Facebook Post", priority: "recommended", why: "Facebook Shops catalog + retargeting ads", services: [EXT.metaads, EXT.fbshops, EXT.buffer] },
      { channelId: "email", emoji: "📧", label: "Email", priority: "recommended", why: "Launch + restock notifications for the subscriber list", services: [EXT.mailchimp, EXT.brevo] },
      { channelId: "landing_page", emoji: "🌐", label: "Landing Page", priority: "optional", why: "Product page with specs + reviews + checkout", services: [EXT.shopify, EXT.carrd] },
    ],
    adjacentHints: [EXT.shopify, EXT.woo, EXT.fbshops, EXT.gads, EXT.metapixel, EXT.ga4, EXT.canva],
  },
};

// ── Sub-components ────────────────────────────────────────────────────────────
const CATEGORY_META: Record<Category, { label: string; color: string }> = {
  social:      { label: "Social Media",     color: "#3B82F6" },
  outreach:    { label: "Outreach",         color: "var(--color-primary)" },
  marketplace: { label: "Marketplace",      color: "#10B981" },
  analytics:   { label: "Analytics",        color: "#8B5CF6" },
  automation:  { label: "Automation",       color: "#EC4899" },
  creation:    { label: "Content creation", color: "#F97316" },
};

const PRIORITY_META: Record<Priority, { label: string; color: string; bg: string }> = {
  must:        { label: "Essential",       color: "#1DB954", bg: "rgba(29,185,84,0.1)"  },
  recommended: { label: "Recommended",     color: "var(--color-primary)", bg: "rgba(245,158,11,0.1)" },
  optional:    { label: "Optional",        color: "#94A3B8", bg: "rgba(148,163,184,0.1)"},
};

function ServiceCard({ svc }: { svc: ExtService }) {
  const cat = CATEGORY_META[svc.category];
  return (
    <div className="flex items-start gap-2 p-2 rounded-lg"
      style={{ backgroundColor: "rgba(245,215,160,0.04)", border: "1px solid rgba(245,215,160,0.12)" }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold" style={{ color: "var(--color-text)" }}>{svc.name}</span>
          {svc.free && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
              style={{ backgroundColor: "rgba(29,185,84,0.12)", color: GREEN }}>FREE</span>
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
          <span className="text-sm font-bold" style={{ color: "var(--color-text)" }}>{ch.label}</span>
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
              <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#A8967E" }}>Recommended tools</p>
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
      style={{ border: "1px solid rgba(245,215,160,0.2)", backgroundColor: "var(--color-bg-secondary)" }}>

      {/* Header */}
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-500/5 transition-all">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4" style={{ color: AMBER }} />
          <div className="text-left">
            <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
              Recommended adjacent services
            </p>
            <p className="text-xs" style={{ color: "#A8967E" }}>
              Adapted for: <strong style={{ color: AMBER }}>{cfg.label}</strong>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-1 rounded-lg font-bold"
            style={{ backgroundColor: `${AMBER}15`, color: AMBER }}>
            {cfg.channels.length} channels • {cfg.adjacentHints.length} tools
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
              { id: "channels", label: "📡 Priority channels" },
              { id: "sources",  label: "🔍 Research sources" },
              { id: "hints",    label: "🛠️ External tools" },
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
                  Priority order for <strong style={{ color: "#78614E" }}>{cfg.label}</strong> — essential channels marked in green
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
                  The most effective research sources for this type of campaign
                </p>
                {cfg.researchSources.map(src => (
                  <div key={src.id} className="flex items-start gap-3 p-3 rounded-xl"
                    style={{ backgroundColor: "rgba(245,215,160,0.05)", border: "1px solid rgba(245,215,160,0.15)" }}>
                    <span className="text-lg">{src.emoji}</span>
                    <div>
                      <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>{src.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#78614E" }}>{src.why}</p>
                    </div>
                    <Star className="w-3.5 h-3.5 mt-0.5 ml-auto flex-shrink-0" style={{ color: AMBER }} />
                  </div>
                ))}
                <div className="rounded-xl p-3"
                  style={{ backgroundColor: "rgba(29,185,84,0.05)", border: "1px solid rgba(29,185,84,0.15)" }}>
                  <p className="text-xs font-bold" style={{ color: GREEN }}>💡 Research tip</p>
                  <p className="text-xs mt-1" style={{ color: "#78614E" }}>
                    Activate the recommended sources in Step 3 of the wizard for the best results on your campaign type.
                  </p>
                </div>
              </div>
            )}

            {/* ── Tab: External hints ── */}
            {tab === "hints" && (
              <div className="space-y-3">
                <p className="text-xs" style={{ color: "#A8967E" }}>
                  External tools you can combine with the platform for complete campaigns
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
                  <p className="text-xs font-bold" style={{ color: PURPLE }}>🔌 Upcoming integrations</p>
                  <p className="text-xs mt-1" style={{ color: "#78614E" }}>
                    The platform will integrate direct SMS sending, Email and social media posting without leaving the app. Coming soon.
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
