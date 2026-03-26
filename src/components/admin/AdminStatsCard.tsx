interface AdminStatsCardProps {
  title: string;
  value: string | number;
  change: string;
  icon: string;
}

export default function AdminStatsCard({
  title,
  value,
  change,
  icon,
}: AdminStatsCardProps) {
  const isPositive = change.startsWith("+");

  return (
    <div
      className="rounded-xl p-6 transition-all hover:shadow-lg"
      style={{
        backgroundColor: "#FFFCF7",
        border: "1px solid rgba(245,215,160,0.25)",
        boxShadow: "0 1px 3px rgba(120,97,78,0.08)",
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="text-3xl">{icon}</div>
        <p
          className={`text-sm font-semibold ${
            isPositive ? "text-green-600" : "text-red-600"
          }`}
        >
          {change}
        </p>
      </div>
      <h3 className="text-sm text-gray-600 mb-1">{title}</h3>
      <p className="text-3xl font-bold" style={{ color: "#292524" }}>
        {value}
      </p>
    </div>
  );
}
