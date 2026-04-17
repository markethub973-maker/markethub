export type ServiceStatus = "ok" | "warning" | "critical";

export interface TrackedService {
  id: string;
  name: string;
  icon: string;
  cost: string;
  dueInDays: number | null;
  usagePercent: number | null;
  usageLabel: string;
  status: ServiceStatus;
  statusLabel: string;
}

export function getTrackedServices(): TrackedService[] {
  return [
    {
      id: "vercel", name: "Vercel Hosting", icon: "▲",
      cost: "$0/mo", dueInDays: null, usagePercent: 73,
      usageLabel: "Hobby plan — 73% build minutes used",
      status: "warning", statusLabel: "High usage",
    },
    {
      id: "anthropic", name: "Anthropic API", icon: "◈",
      cost: "$32/$50", dueInDays: null, usagePercent: 68,
      usageLabel: "Monthly budget — $32 used of $50",
      status: "warning", statusLabel: "High usage",
    },
    {
      id: "resend", name: "Resend Email", icon: "✉",
      cost: "$0", dueInDays: 12, usagePercent: 45,
      usageLabel: "2,841 emails sent — 45% quota",
      status: "ok", statusLabel: "OK",
    },
    {
      id: "supabase", name: "Supabase DB", icon: "🗄",
      cost: "$0", dueInDays: null, usagePercent: 60,
      usageLabel: "Free tier — 60% storage used",
      status: "ok", statusLabel: "OK",
    },
  ];
}

export function getServiceAlertCount(): number {
  return getTrackedServices().filter(
    (s) => s.status === "warning" || s.status === "critical",
  ).length;
}
