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
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="mt-1.5 text-2xl font-bold text-gray-900">{value}</p>
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
