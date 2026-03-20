import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  change?: number;
  icon?: React.ReactNode;
  accent?: string;
}

export default function StatCard({ title, value, change, icon, accent = "#39D3B8" }: StatCardProps) {
  const positive = (change ?? 0) >= 0;

  return (
    <div className="rounded-xl p-5 transition-shadow hover:shadow-md" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#A8967E" }}>{title}</p>
          <p className="mt-1.5 text-2xl font-bold" style={{ color: "#292524" }}>{value}</p>
        </div>
        {icon && (
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: accent + "20" }}
          >
            <span style={{ color: accent }}>{icon}</span>
          </div>
        )}
      </div>
      {change !== undefined && (
        <div className={cn("flex items-center gap-1 mt-3 text-xs font-semibold", positive ? "text-emerald-600" : "text-red-500")}>
          {positive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {positive ? "+" : ""}{change.toFixed(1)}% vs last month
        </div>
      )}
    </div>
  );
}
