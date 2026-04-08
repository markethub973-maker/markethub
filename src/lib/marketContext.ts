/**
 * Real-time market context for the APEX Marketing Advisor.
 * Returns current date, season, day-of-week, upcoming events/holidays,
 * and seasonal buying patterns for ANY country — no external APIs needed.
 *
 * Everything returned is in English — the LLM adapts it to the user's
 * question language and the target market's cultural context.
 */

export interface MarketContext {
  date: string;             // "2026-04-08"
  dayOfWeek: string;        // "Wednesday, 8 April 2026"
  timeOfDay: string;        // "morning" | "afternoon" | "evening" | "night"
  month: number;            // 1-12
  season: string;           // spring | summer | autumn | winter
  hemisphere: "N" | "S";
  upcomingEvents: string[]; // relevant events in current + next month
  buyingPatterns: string;   // current buying behavior for the season
  platformPeakNow: string;  // which platform is hottest RIGHT NOW (time of day)
  urgencySignals: string[]; // real-time urgency creators
  antiPatterns: string[];   // what NOT to do in this season/period
  timezone: string;         // resolved IANA timezone for the location
  locationUsed: string;     // echoes the location the context was built for
}

const EN_DAYS = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];
const EN_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Universal events per month. Grouped by region / culture.
 * The LLM picks what's relevant to the target market — we give it
 * a rich menu, NOT a prescribed answer.
 */
const MONTHLY_EVENTS: Record<number, string[]> = {
  1: [
    "New Year sales + resolutions (gym, coaching, courses sell well globally)",
    "Chinese New Year shopping peak (SE Asia, China, overseas Chinese communities)",
    "Post-holiday discount hunt — clearance & returns drive traffic",
    "B2B budgets reopen — enterprise sales cycles restart",
  ],
  2: [
    "Valentine's Day 14 Feb — gifting, experiences, florists, jewellery (global)",
    "Super Bowl weekend (US) — food delivery, beer, party supplies",
    "Chinese New Year (variable date) — red envelopes, family travel",
    "B2B prospecting warm-up before Q1 push",
  ],
  3: [
    "International Women's Day 8 Mar — gifts, beauty, spa, restaurants",
    "Holi (India) — colour, sweets, travel",
    "Ramadan may start (variable) — MENA + Muslim markets shift hours, Iftar specials",
    "Spring arrives N hemisphere — outdoor events begin, home refresh",
    "End of fiscal year (UK, JP, IN) — B2B last-minute spend",
  ],
  4: [
    "Easter — gifting, chocolate, family travel, fashion (Christian markets)",
    "Ramadan / Eid al-Fitr (variable) — MENA peak gifting, clothes, food",
    "Songkran (Thailand), Vaisakhi (India/Sikh) — festival commerce",
    "Wedding season starts in N hemisphere — DJ, venues, catering demand spikes",
    "Spring cleaning — home services, storage, decluttering content",
  ],
  5: [
    "Mother's Day (2nd Sun US/CA/AU, varies EU) — florists, gifts, restaurants",
    "Labour Day 1 May — mini-break travel, outdoor, BBQ",
    "Cinco de Mayo (US/Mexico) — food & beverage",
    "Peak wedding + christening season N hemisphere",
    "Golden Week (Japan) — travel, retail shutdown early in month",
  ],
  6: [
    "Father's Day (3rd Sun most markets) — gifts, experiences, tools",
    "Pride month (West) — brand activations, LGBTQ+ inclusive campaigns",
    "Summer travel booking peak — flights, hotels, experiences",
    "Wedding season peak — prices high, inventory tight",
    "Eid al-Adha (variable) — MENA family gifting, livestock, travel",
  ],
  7: [
    "Summer holidays — beach, travel, kids activities, camps",
    "B2B slow season (N hemisphere — execs on vacation, avoid long cold outreach)",
    "Amazon Prime Day (mid-July) — e-commerce discount peak",
    "Back-to-school prep starts late July (US)",
  ],
  8: [
    "Back-to-school peak (US, most of Europe late Aug)",
    "Raksha Bandhan (India) — gifting",
    "Last month of summer holidays — travel deals, kids entertainment",
    "Festival season N hemisphere — music, food, outdoor",
  ],
  9: [
    "Back-to-school / back-to-work — stationery, laptops, courses, tutoring",
    "B2B returns full force — best month for enterprise cold outreach",
    "Autumn arrives N hemisphere — fashion, home, seasonal food",
    "Oktoberfest kicks off (late Sep, DE) — beer, costumes, travel",
  ],
  10: [
    "Halloween (US/UK/global youth) — costumes, decor, parties, themed content",
    "Diwali (India, variable) — gifting, sweets, fashion, gold, travel — biggest retail event in India",
    "Singles' Day warm-up (China, 11/11 coming)",
    "Autumn travel — leaf-peeping, short breaks",
    "Canadian Thanksgiving (2nd Mon)",
  ],
  11: [
    "Singles' Day 11/11 — biggest e-commerce day globally (China, SE Asia, spreading West)",
    "Black Friday + Cyber Monday — global retail peak",
    "US Thanksgiving (4th Thu) — family, travel, food",
    "Christmas / holiday shopping launch",
    "Movember — men's health campaigns",
  ],
  12: [
    "Christmas peak — gifting, decor, food, corporate parties, family travel",
    "Boxing Day 26 Dec — UK/CA/AU sales peak",
    "New Year countdown — parties, fashion, resolutions content primer",
    "B2B shuts down mid-month — avoid outreach after 15 Dec",
    "Last-chance fiscal-year spend (US companies on calendar year)",
  ],
};

/** Seasonal buying pattern language — picked by the LLM for the target hemisphere. */
const SEASON_BUYING: Record<string, string> = {
  spring:
    "Spring lifts discretionary spend — renovations, events, wardrobe refresh. Positive and 'new start' messaging converts. Wedding + baby seasons drive services demand.",
  summer:
    "Summer shifts spend toward experiences and travel. Mobile shopping peaks (+30-40%). Outdoor, lifestyle, and travel imagery win. Avoid heavy B2B outreach in July-August (N hemisphere exec vacations).",
  autumn:
    "Autumn flips consumers into 'serious mode' — back to school/work, B2B reopens aggressively. ROI-driven and evidence-based messaging outperforms emotional. Best window of the year for cold B2B outreach.",
  winter:
    "Winter emotion beats logic — gifting, nostalgia, tradition. Black Friday + Singles' Day + Christmas = global retail peak. Urgency and scarcity ('last pieces', 'ends tonight') are at maximum effectiveness.",
};

function getSeason(
  month: number,
  hemisphere: "N" | "S",
): { season: string } {
  // Flip for Southern hemisphere
  const shift = hemisphere === "S" ? 6 : 0;
  const m = ((month - 1 + shift) % 12) + 1;
  if (m >= 3 && m <= 5) return { season: "spring" };
  if (m >= 6 && m <= 8) return { season: "summer" };
  if (m >= 9 && m <= 11) return { season: "autumn" };
  return { season: "winter" };
}

function getTimeOfDay(hour: number): string {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

function getPlatformPeakNow(hour: number, dayOfWeek: number): string {
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  if (hour >= 6 && hour < 10)
    return "Instagram Reels + TikTok (morning scroll before work — hook-driven short video wins)";
  if (hour >= 10 && hour < 12)
    return "Facebook + Google Search (active browsing during work / coffee break)";
  if (hour >= 12 && hour < 14)
    return "Facebook Groups + WhatsApp + LinkedIn (lunch break — peak engagement on professional and community content)";
  if (hour >= 14 && hour < 17)
    return "LinkedIn + Email (afternoon work window — B2B outreach and thought leadership peak)";
  if (hour >= 17 && hour < 20)
    return "Instagram Stories + TikTok (post-work commute scroll — short, emotional, visual wins)";
  if (hour >= 20 && hour < 23)
    return isWeekend
      ? "TikTok + YouTube + Instagram (weekend evening — long-form entertainment and binge content)"
      : "TikTok + Instagram Reels + YouTube (weekday wind-down — 15-60s video peak)";
  return "Scheduled send for next morning (organic reach is lowest between 23:00 and 05:00 in most markets)";
}

/**
 * Very compact location → IANA timezone + hemisphere mapping.
 * Falls back to UTC + Northern hemisphere when the location is unknown —
 * this is a *context* helper, not a geolocation service, so precise matching
 * is not required. The LLM is told which timezone we used.
 */
const LOCATION_MAP: Record<
  string,
  { tz: string; hemisphere: "N" | "S" }
> = {
  // Americas
  "united states": { tz: "America/New_York", hemisphere: "N" },
  usa: { tz: "America/New_York", hemisphere: "N" },
  us: { tz: "America/New_York", hemisphere: "N" },
  canada: { tz: "America/Toronto", hemisphere: "N" },
  mexico: { tz: "America/Mexico_City", hemisphere: "N" },
  brazil: { tz: "America/Sao_Paulo", hemisphere: "S" },
  argentina: { tz: "America/Argentina/Buenos_Aires", hemisphere: "S" },
  chile: { tz: "America/Santiago", hemisphere: "S" },
  colombia: { tz: "America/Bogota", hemisphere: "N" },
  // Europe
  "united kingdom": { tz: "Europe/London", hemisphere: "N" },
  uk: { tz: "Europe/London", hemisphere: "N" },
  ireland: { tz: "Europe/Dublin", hemisphere: "N" },
  germany: { tz: "Europe/Berlin", hemisphere: "N" },
  france: { tz: "Europe/Paris", hemisphere: "N" },
  spain: { tz: "Europe/Madrid", hemisphere: "N" },
  italy: { tz: "Europe/Rome", hemisphere: "N" },
  netherlands: { tz: "Europe/Amsterdam", hemisphere: "N" },
  portugal: { tz: "Europe/Lisbon", hemisphere: "N" },
  poland: { tz: "Europe/Warsaw", hemisphere: "N" },
  romania: { tz: "Europe/Bucharest", hemisphere: "N" },
  greece: { tz: "Europe/Athens", hemisphere: "N" },
  sweden: { tz: "Europe/Stockholm", hemisphere: "N" },
  norway: { tz: "Europe/Oslo", hemisphere: "N" },
  denmark: { tz: "Europe/Copenhagen", hemisphere: "N" },
  finland: { tz: "Europe/Helsinki", hemisphere: "N" },
  switzerland: { tz: "Europe/Zurich", hemisphere: "N" },
  austria: { tz: "Europe/Vienna", hemisphere: "N" },
  belgium: { tz: "Europe/Brussels", hemisphere: "N" },
  // MENA
  "saudi arabia": { tz: "Asia/Riyadh", hemisphere: "N" },
  uae: { tz: "Asia/Dubai", hemisphere: "N" },
  "united arab emirates": { tz: "Asia/Dubai", hemisphere: "N" },
  qatar: { tz: "Asia/Qatar", hemisphere: "N" },
  egypt: { tz: "Africa/Cairo", hemisphere: "N" },
  israel: { tz: "Asia/Jerusalem", hemisphere: "N" },
  turkey: { tz: "Europe/Istanbul", hemisphere: "N" },
  // Asia-Pacific
  india: { tz: "Asia/Kolkata", hemisphere: "N" },
  china: { tz: "Asia/Shanghai", hemisphere: "N" },
  japan: { tz: "Asia/Tokyo", hemisphere: "N" },
  "south korea": { tz: "Asia/Seoul", hemisphere: "N" },
  korea: { tz: "Asia/Seoul", hemisphere: "N" },
  singapore: { tz: "Asia/Singapore", hemisphere: "N" },
  indonesia: { tz: "Asia/Jakarta", hemisphere: "S" },
  thailand: { tz: "Asia/Bangkok", hemisphere: "N" },
  vietnam: { tz: "Asia/Ho_Chi_Minh", hemisphere: "N" },
  philippines: { tz: "Asia/Manila", hemisphere: "N" },
  malaysia: { tz: "Asia/Kuala_Lumpur", hemisphere: "N" },
  australia: { tz: "Australia/Sydney", hemisphere: "S" },
  "new zealand": { tz: "Pacific/Auckland", hemisphere: "S" },
  // Africa
  "south africa": { tz: "Africa/Johannesburg", hemisphere: "S" },
  nigeria: { tz: "Africa/Lagos", hemisphere: "N" },
  kenya: { tz: "Africa/Nairobi", hemisphere: "S" },
};

function resolveLocation(
  location?: string,
): { tz: string; hemisphere: "N" | "S"; used: string } {
  if (!location) return { tz: "UTC", hemisphere: "N", used: "global" };
  const key = location.trim().toLowerCase();
  // Try exact match first, then startsWith fallback
  if (LOCATION_MAP[key]) {
    return { ...LOCATION_MAP[key], used: location };
  }
  const fuzzy = Object.entries(LOCATION_MAP).find(
    ([k]) => key.includes(k) || k.includes(key),
  );
  if (fuzzy) return { ...fuzzy[1], used: location };
  return { tz: "UTC", hemisphere: "N", used: location };
}

export function getMarketContext(location?: string): MarketContext {
  const { tz, hemisphere, used } = resolveLocation(location);
  const now = new Date();
  const local = new Date(now.toLocaleString("en-US", { timeZone: tz }));

  const month = local.getMonth() + 1;
  const dayOfWeekIdx = local.getDay();
  const hour = local.getHours();
  const { season } = getSeason(month, hemisphere);

  const dateStr = local.toISOString().split("T")[0];
  const dayName = EN_DAYS[dayOfWeekIdx];
  const monthName = EN_MONTHS[month - 1];
  const timeOfDay = getTimeOfDay(hour);

  // Pull this month + next month events together (richer window for the LLM)
  const nextMonth = month === 12 ? 1 : month + 1;
  const upcomingEvents = [
    ...(MONTHLY_EVENTS[month] ?? []),
    ...(MONTHLY_EVENTS[nextMonth] ?? []).map((e) => `(next month) ${e}`),
  ];

  // Urgency signals based on day/time — universal wording
  const urgencySignals: string[] = [];
  if (dayOfWeekIdx === 1)
    urgencySignals.push("Monday — people plan the week ahead: 'book now / reserve this week' framing converts best");
  if (dayOfWeekIdx === 4)
    urgencySignals.push("Thursday — weekend planning peak: best day to push weekend offers");
  if (dayOfWeekIdx === 5)
    urgencySignals.push("Friday — last push before the weekend: urgency + short deadlines work hardest");
  if (dayOfWeekIdx === 0 || dayOfWeekIdx === 6)
    urgencySignals.push("Weekend — relaxed browsing, higher engagement on entertainment + lifestyle content");
  if (timeOfDay === "morning")
    urgencySignals.push("Morning — educational and inspirational content outperforms direct pitches");
  if (timeOfDay === "evening")
    urgencySignals.push("Evening — decision + unwind window: testimonials and social proof convert strongest");

  // Anti-patterns for this period
  const antiPatterns: string[] = [];
  if ((hemisphere === "N" && month >= 7 && month <= 8) ||
      (hemisphere === "S" && (month === 1 || month === 2))) {
    antiPatterns.push("Avoid long B2B cold outreach during peak summer holidays — decision-makers are off");
  }
  if (dayOfWeekIdx === 1 && timeOfDay === "morning")
    antiPatterns.push("Monday morning — avoid aggressive sales pitches, inbox is at its busiest");
  if (dayOfWeekIdx === 5 && hour >= 14)
    antiPatterns.push("Friday afternoon — engagement collapses fast, save your best content for next week");
  if (month === 12 && local.getDate() >= 15)
    antiPatterns.push("Second half of December — B2B largely shut; focus B2C gifting instead");

  return {
    date: dateStr,
    dayOfWeek: `${dayName}, ${local.getDate()} ${monthName} ${local.getFullYear()}`,
    timeOfDay,
    month,
    season,
    hemisphere,
    upcomingEvents,
    buyingPatterns: SEASON_BUYING[season] || "",
    platformPeakNow: getPlatformPeakNow(hour, dayOfWeekIdx),
    urgencySignals,
    antiPatterns,
    timezone: tz,
    locationUsed: used,
  };
}
