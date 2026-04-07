"use client";

import { CheckCircle2, Circle, ArrowRight, Lightbulb } from "lucide-react";

const AMBER = "#F59E0B";
const GREEN = "#1DB954";

interface StepAction {
  label: string;
  detail: string;
  done?: boolean;
}

interface StepConfig {
  title: string;
  subtitle: string;
  actions: StepAction[];
  next: string;
  tip: string;
}

const STEP_CONFIGS: Record<number, (ctx: StepGuideContext) => StepConfig> = {
  1: (ctx) => ({
    title: "Definește ce vinzi",
    subtitle: "Cu cât ești mai specific, cu atât AI-ul găsește clienți mai buni",
    actions: [
      { label: "Selectează tipul ofertei", detail: "Serviciu, produs fizic, mâncare, afiliere, app etc.", done: !!ctx.offerType },
      { label: "Descrie oferta în 1-2 propoziții", detail: "Include ce faci, pentru cine, unde — fii concret, nu generic", done: ctx.offerText.trim().length > 20 },
      { label: "Menționează diferențiatorul", detail: "Ce ai tu în plus față de concurență? Preț, calitate, unicitate?", done: ctx.offerText.trim().length > 60 },
    ],
    next: "Definirea audienței țintă",
    tip: ctx.offerType === "food_beverage"
      ? "Mâncarea se vinde vizual — pregătește poze de calitate pentru campanie"
      : ctx.offerType === "affiliate"
      ? "La afiliere, transparența bate totul — spune că promovezi, nu ascunde"
      : ctx.offerType === "software"
      ? "Pentru app/SaaS, demo-ul video scurt bate orice text"
      : "Ofertele cu testimoniale concrete se convertesc de 3x mai bine",
  }),

  2: (ctx) => ({
    title: "Definește audiența ideală",
    subtitle: "Targetarea greșită = bani aruncați — fii precis",
    actions: [
      { label: "Alege tipul clientului (B2C/B2B/Ambele)", detail: "B2C = persoane fizice, B2B = firme. Mesajul diferă complet", done: !!ctx.audienceType },
      { label: "Setează locația", detail: "Oraș, regiune sau toată România — afectează sursele și mesajul", done: !!ctx.location },
      { label: "Alege range-ul de buget al clienților", detail: "Știind bugetul lor, știi cum să comunici valoarea", done: !!ctx.budgetRange },
    ],
    next: "Selectarea surselor AI de căutare",
    tip: ctx.audienceType === "b2b"
      ? "B2B: LinkedIn + Google + cold email bat Facebook și TikTok pentru prospecți de firmă"
      : "B2C: Facebook Groups + OLX + Google Maps sunt cele mai bogate surse de lead-uri locale",
  }),

  3: (ctx) => ({
    title: "Selectează sursele de căutare",
    subtitle: "AI-ul a ales sursele optime — le poți ajusta manual",
    actions: [
      { label: "Verifică sursele activate de AI", detail: "Fiecare sursă are un scor de potrivire — activează-le pe cele cu intent ridicat", done: true },
      { label: "Ajustează query-urile de căutare", detail: "Poți edita manual cuvintele cheie per sursă — fii specific cu locația și evenimentul", done: false },
      { label: "Alege 3-5 surse maxim", detail: "Prea multe surse = date zgomotoase. Calitate > cantitate", done: false },
    ],
    next: "Analiza și scorarea lead-urilor",
    tip: "Google + Facebook Groups + OLX este combinația care aduce cel mai bun ROI pentru România",
  }),

  4: (ctx) => ({
    title: "Analizează lead-urile găsite",
    subtitle: ctx.leadsCount > 0 ? `${ctx.leadsCount} prospecți găsiți — filtrează și alege` : "Căutarea este în progres…",
    actions: [
      { label: "Filtrează după scor (HOT > WARM > COLD)", detail: "Concentrează-te pe leads HOT și WARM — cold leads costă mult timp", done: ctx.leadsCount > 0 },
      { label: "Deschide sursele și verifică contextul", detail: "Click pe linkul fiecărui lead pentru a vedea contextul real", done: false },
      { label: "Salvează cele mai bune lead-uri în CRM", detail: "Leads HOT salvate = pipeline activ pe care îl poți urmări", done: false },
    ],
    next: "Crearea mesajului de outreach personalizat",
    tip: ctx.leadsCount > 0
      ? `Din ${ctx.leadsCount} leads, concentrează-te pe primele ${Math.min(5, ctx.leadsCount)} — calitatea bate cantitatea`
      : "Dacă nu găsești leads, schimbă query-ul sau sursa, nu oferta",
  }),

  5: (_ctx) => ({
    title: "Outreach & Campanie completă",
    subtitle: "Mesaj personalizat + 9 materiale de marketing generate AI",
    actions: [
      { label: "Copiază mesajul de outreach și trimite", detail: "Folosește platforma recomandată — nu trimite același mesaj pe toate", done: false },
      { label: "Completează datele de contact", detail: "Phone, email, website, WhatsApp — se integrează în toate materialele campaniei", done: false },
      { label: "Generează campania completă (9 materiale)", detail: "SMS, Email, WhatsApp, Facebook, Instagram, TikTok, Landing page, Video brief, Brief foto", done: false },
    ],
    next: "Trimite, urmărește răspunsul, re-targetează",
    tip: "Nu trimite același mesaj la 50 de oameni. 10 mesaje personalizate bat 200 generice.",
  }),
};

interface StepGuideContext {
  offerType: string;
  offerText: string;
  audienceType: string;
  location: string;
  budgetRange: string;
  leadsCount: number;
}

interface Props extends StepGuideContext {
  step: number;
}

export default function StepGuide({ step, offerType, offerText, audienceType, location, budgetRange, leadsCount }: Props) {
  const ctx: StepGuideContext = { offerType, offerText, audienceType, location, budgetRange, leadsCount };
  const config = STEP_CONFIGS[step]?.(ctx);
  if (!config) return null;

  const doneCount = config.actions.filter(a => a.done).length;
  const progress = Math.round((doneCount / config.actions.length) * 100);

  return (
    <div className="rounded-2xl p-4 space-y-3"
      style={{ backgroundColor: "rgba(245,215,160,0.04)", border: "1px solid rgba(245,215,160,0.12)" }}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold" style={{ color: AMBER }}>Ghid pas {step}/5</p>
          <p className="text-sm font-bold" style={{ color: "#292524" }}>{config.title}</p>
          <p className="text-xs" style={{ color: "#A8967E" }}>{config.subtitle}</p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold"
            style={{
              background: `conic-gradient(${AMBER} ${progress * 3.6}deg, rgba(245,215,160,0.15) 0deg)`,
              color: "#292524",
            }}>
            {progress}%
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        {config.actions.map((action, i) => (
          <div key={i} className="flex items-start gap-2.5">
            {action.done
              ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: GREEN }} />
              : <Circle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "rgba(245,215,160,0.3)" }} />}
            <div>
              <p className="text-xs font-semibold" style={{ color: action.done ? GREEN : "#292524" }}>{action.label}</p>
              <p className="text-xs" style={{ color: "#A8967E" }}>{action.detail}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tip */}
      <div className="rounded-lg px-3 py-2 flex gap-2"
        style={{ backgroundColor: `${AMBER}08`, border: `1px solid ${AMBER}20` }}>
        <Lightbulb className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: AMBER }} />
        <p className="text-xs" style={{ color: "#78614E", lineHeight: 1.6 }}>{config.tip}</p>
      </div>

      {/* Next step */}
      <div className="flex items-center gap-2">
        <ArrowRight className="w-3.5 h-3.5" style={{ color: "rgba(245,215,160,0.4)" }} />
        <p className="text-xs" style={{ color: "#A8967E" }}>Urmează: <span className="font-semibold" style={{ color: "#78614E" }}>{config.next}</span></p>
      </div>
    </div>
  );
}
