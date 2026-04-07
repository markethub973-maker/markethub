/**
 * Real-time market context for the Marketing Advisor.
 * Returns current date, season, day-of-week, upcoming events/holidays,
 * and seasonal buying patterns — no external APIs needed.
 */

export interface MarketContext {
  date: string;           // "2026-04-08"
  dayOfWeek: string;      // "Miercuri"
  timeOfDay: string;      // "morning" | "afternoon" | "evening" | "night"
  month: number;          // 1-12
  season: string;         // "primăvară" | "vară" | "toamnă" | "iarnă"
  seasonEn: string;       // spring | summer | autumn | winter
  upcomingEvents: string[]; // relevant events in next 30 days
  buyingPatterns: string;  // current buying behavior for the season
  platformPeakNow: string; // which platform is hottest RIGHT NOW (time of day)
  urgencySignals: string[]; // real-time urgency creators
  antiPatterns: string[];   // what NOT to do in this season/period
}

const RO_DAYS = ["Duminică", "Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă"];
const RO_MONTHS = ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
                   "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"];

// Romanian & universal events by month (1-indexed)
const MONTHLY_EVENTS: Record<number, string[]> = {
  1:  ["Revelion — ofertele de reduceri post-sărbători merg bine", "Oamenii fac bilanțuri și planuri noi — vând cursuri/coaches bine", "Sezon slab pentru events — concentrare pe digital"],
  2:  ["Valentine's Day 14 Feb — vânzări cadouri, experiențe, florării", "Dragobete 24 Feb — similar Valentine's pentru piața locală", "Sezon bun pentru dating apps, bijuterii, restaurante romantice"],
  3:  ["Mărțișor 1 Martie — handmade, cadouri mici, florării explozie", "8 Martie Ziua Femeii — cadouri, beauty, spa, restaurante", "Sezon de primăvară — oamenii ies, Events outdoor încep"],
  4:  ["Paște — cadouri, dulciuri, miel, turizm intern, haine noi", "Sezon nuntă începe — DJ, foto, catering, venue în cerere mare", "Curățenie de primăvară — produse casă, servicii curățenie"],
  5:  ["1 Mai — minivacanță, turism, grătare, picnic", "Sezon peak nunți + botezuri — events services la maxim", "Florării active — Ziua Mamei prima duminică din Mai"],
  6:  ["Vară — evenimente outdoor, festival season, vacanțe", "Sezon nunți peak — rezervări deja ocupate, prețuri mari", "Produse beach/pool, sunscreen, haine vară"],
  7:  ["Vacanțe de vară — turism, activități copii, tabere", "Sezon slab B2B (toată lumea în concediu)", "Food delivery up 40% în weekend"],
  8:  ["August — vacanțe peak, business mai lent", "Pregătiri pentru toamnă — back-to-school la final de lună", "Festival season — muzică, outdoor events"],
  9:  ["Back to school — ghiozdane, rechizite, cursuri, meditații", "Toamna vine — haine, produse sezoniere", "Sezon nunți se termină — ultima lună bună", "Business revine — B2B activ din nou"],
  10: ["Halloween — costume, decorațiuni, petreceri tematice", "Toamnă — produse sezoniere, vinuri, fructe", "Sezon mort pentru nunți — prețuri DJ/foto mai mici"],
  11: ["Black Friday — reduceri masive, cumpărături online peak absolut", "Pregătiri Crăciun încep — cadouri, decorațiuni", "Sezon rece — produse casă, comfort food, delivery"],
  12: ["Crăciun — cadouri, decorațiuni, mâncare festivă, party corporate", "Revelion aproape — countdown deals, petreceri", "Sezon peak pentru restaurant/catering/events corporate"],
};

const SEASON_BUYING: Record<string, string> = {
  spring: "Oamenii cheltuiesc mai mult în primăvară — energie nouă, renovări, evenimente. Mesageria pozitivă și proaspătă convertește bine. Nudge: 'sezonul nunților a început'.",
  summer: "Vara oamenii sunt în vacanță dar cumpără experiențe și entertainment. Mobile shopping +35%. Imagini colorate, outdoor, lifestyle. Evitați emailuri B2B în iulie-august.",
  autumn: "Toamna vine back-to-school și B2B revine puternic. Oamenii sunt mai serioși și analizează mai mult. ROI și beneficii concrete convertesc mai bine decât emoțional.",
  winter: "Iarna emoționalul bate raționalul — cadouri, tradiționalul, nostalgia. Black Friday + Crăciun = vânzări explosive dacă ești pregătit. Urgency 'ultimele bucăți' funcționează maxim.",
};

function getSeason(month: number): { season: string; seasonEn: string } {
  if (month >= 3 && month <= 5) return { season: "primăvară", seasonEn: "spring" };
  if (month >= 6 && month <= 8) return { season: "vară", seasonEn: "summer" };
  if (month >= 9 && month <= 11) return { season: "toamnă", seasonEn: "autumn" };
  return { season: "iarnă", seasonEn: "winter" };
}

function getTimeOfDay(hour: number): string {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

function getPlatformPeakNow(hour: number, dayOfWeek: number): string {
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  if (hour >= 6 && hour < 10) return "Instagram Reels + TikTok (scroll de dimineață înainte de job)";
  if (hour >= 10 && hour < 14) return "Facebook + Google (browsing activ, oamenii sunt la birou sau în pauză)";
  if (hour >= 12 && hour < 14) return "Facebook Groups + WhatsApp (pauza de prânz — engagement maxim)";
  if (hour >= 17 && hour < 20) return "Instagram Stories + TikTok (după muncă, transport spre casă)";
  if (hour >= 20 && hour < 23) return isWeekend ? "TikTok + YouTube + Instagram (seara relaxare weekend)" : "TikTok + Instagram Reels (seara de luni-joi)";
  return "Email scheduling (trimitere programată pentru dimineață)";
}

export function getMarketContext(): MarketContext {
  const now = new Date();
  // Romania timezone offset
  const roNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Bucharest" }));

  const month = roNow.getMonth() + 1;
  const dayOfWeekIdx = roNow.getDay();
  const hour = roNow.getHours();
  const { season, seasonEn } = getSeason(month);

  const dateStr = roNow.toISOString().split("T")[0];
  const dayName = RO_DAYS[dayOfWeekIdx];
  const monthName = RO_MONTHS[month - 1];
  const timeOfDay = getTimeOfDay(hour);

  // Urgency signals based on day/time
  const urgencySignals: string[] = [];
  if (dayOfWeekIdx === 1) urgencySignals.push("Luni — oamenii planifică săptămâna, perfect pentru oferte 'rezervă acum'");
  if (dayOfWeekIdx === 4) urgencySignals.push("Joi — oamenii planifică weekendul, cel mai bun moment pentru oferte weekend");
  if (dayOfWeekIdx === 5) urgencySignals.push("Vineri — ultimul push înainte de weekend, urgency maximă pentru oferte scurte");
  if (dayOfWeekIdx === 0 || dayOfWeekIdx === 6) urgencySignals.push("Weekend — oamenii au timp, browsing relaxat, engagement mai mare pe entertainment");
  if (timeOfDay === "morning") urgencySignals.push("Dimineața — content educational și inspirațional performează mai bine decât pitch-urile directe");
  if (timeOfDay === "evening") urgencySignals.push("Seara — moment de decizie și relaxare, ofertele cu testimoniale și social proof convertesc cel mai bine");

  // Anti-patterns for this period
  const antiPatterns: string[] = [];
  if (month >= 7 && month <= 8) antiPatterns.push("Evitați emailuri B2B lungi în iulie-august — toată lumea e în concediu");
  if (dayOfWeekIdx === 1 && timeOfDay === "morning") antiPatterns.push("Luni dimineața — evitați pitchuri agresive, oamenii sunt ocupați cu emailurile de la muncă");
  if (dayOfWeekIdx === 5 && hour >= 14) antiPatterns.push("Vineri după-amiaza — engagement scade rapid, salvați content important pentru săptămâna viitoare");
  antiPatterns.push(`Evitați să postați la ore aiurea pentru ${season} — algoritmii penalizează postările fără engagement rapid`);

  return {
    date: dateStr,
    dayOfWeek: `${dayName}, ${roNow.getDate()} ${monthName} ${roNow.getFullYear()}`,
    timeOfDay,
    month,
    season,
    seasonEn,
    upcomingEvents: MONTHLY_EVENTS[month] || [],
    buyingPatterns: SEASON_BUYING[seasonEn] || "",
    platformPeakNow: getPlatformPeakNow(hour, dayOfWeekIdx),
    urgencySignals,
    antiPatterns,
  };
}
