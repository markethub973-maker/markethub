"use client";

import { create } from "zustand";
import { toast } from "@/lib/toast";

export type ThreatLevel = "clean" | "warning" | "alert" | "blocked";

export interface ThreatEntry {
  id: string;
  name: string;
  icon: string;
  description: string;
  level: ThreatLevel;
}

export interface SecurityAgent {
  id: string;
  name: string;
  role: string;
  state: "active" | "standby" | "triggered";
  triggerOn: string[];
}

interface SecurityStore {
  threats: ThreatEntry[];
  agents: SecurityAgent[];
  isUnderAttack: boolean;
  triggerThreat: (threatId: string) => void;
  resolveAll: () => void;
}

const INITIAL_THREATS: ThreatEntry[] = [
  { id: "brute", name: "Brute Force Protection", icon: "🔒", description: "0 attempts last 24h", level: "clean" },
  { id: "ddos", name: "DDoS / Rate Limiting", icon: "🌐", description: "Normal traffic patterns", level: "clean" },
  { id: "apikey", name: "API Key Exposure", icon: "🔑", description: "All keys hashed — no leaks detected", level: "clean" },
  { id: "sqli", name: "SQL Injection Scan", icon: "💉", description: "Last scan: 2h ago — clean", level: "clean" },
  { id: "geo", name: "Geo Anomalies", icon: "📍", description: "3 unusual logins — Romania ✓", level: "warning" },
];

const INITIAL_AGENTS: SecurityAgent[] = [
  { id: "ratelimit", name: "RateLimitGuard", role: "Blocheaza IP-uri abuzive automat", state: "active", triggerOn: ["ddos", "brute"] },
  { id: "authwatch", name: "AuthWatchdog", role: "Monitorizeaza login attempts", state: "active", triggerOn: ["brute", "geo"] },
  { id: "firewall", name: "FirewallAgent", role: "Aplica reguli dinamice pe trafic", state: "standby", triggerOn: ["ddos", "sqli"] },
  { id: "incident", name: "IncidentResponder", role: "Trimite alerta email + blocheaza", state: "standby", triggerOn: ["ddos", "sqli", "apikey"] },
  { id: "lockdown", name: "LockdownMode", role: "Shutdown acces extern total", state: "standby", triggerOn: ["ddos"] },
];

export const useSecurityStore = create<SecurityStore>((set, get) => ({
  threats: INITIAL_THREATS,
  agents: INITIAL_AGENTS,
  isUnderAttack: false,

  triggerThreat: (threatId: string) => {
    set((s) => ({
      isUnderAttack: true,
      threats: s.threats.map((t) =>
        t.id === threatId
          ? { ...t, level: "alert" as ThreatLevel, description: "ACTIVE THREAT DETECTED — responding..." }
          : t,
      ),
      agents: s.agents.map((a) => ({
        ...a,
        state: a.triggerOn.includes(threatId) ? ("triggered" as const) : a.state,
      })),
    }));

    toast.error("Security Alert!", `Threat detected: ${threatId} — agents responding`);

    setTimeout(() => {
      get().resolveAll();
      toast.success("Threat Neutralized", "All agents returned to standby");
    }, 5000);
  },

  resolveAll: () => {
    set((s) => ({
      isUnderAttack: false,
      threats: s.threats.map((t) =>
        t.level === "alert"
          ? { ...t, level: "blocked" as ThreatLevel, description: "Blocked — 3 IPs banned automatically" }
          : t,
      ),
      agents: s.agents.map((a) => ({
        ...a,
        state: a.state === "triggered" ? ("standby" as const) : a.state,
      })),
    }));
  },
}));
