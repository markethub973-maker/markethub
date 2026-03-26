"use client";

import { useEffect, useState } from "react";

interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
}

export default function AdminPricingPanel() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchPrices();
  }, []);

  const fetchPrices = async () => {
    try {
      const response = await fetch("/api/admin/pricing");
      const data = await response.json();
      if (data.success) {
        setPlans(data.plans);
      }
    } catch (err) {
      console.error("Fetch pricing error:", err);
    }
  };

  const handleEditClick = (plan: Plan) => {
    setEditingPlan(plan.id);
    setEditingPrice(plan.price);
    setError("");
    setSuccess("");
  };

  const handleSavePrice = async () => {
    if (!editingPlan) return;

    if (editingPlan === "free_test" && editingPrice !== 0) {
      setError("Free test plan must be free");
      return;
    }

    if (editingPrice < 0) {
      setError("Price cannot be negative");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: editingPlan,
          price: editingPrice,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to update price");
        return;
      }

      setSuccess(data.message);
      setPlans(
        plans.map((p) =>
          p.id === editingPlan ? { ...p, price: editingPrice } : p
        )
      );
      setEditingPlan(null);

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("An error occurred");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="rounded-2xl p-8"
      style={{
        backgroundColor: "#FFFCF7",
        border: "1px solid rgba(245,215,160,0.25)",
      }}
    >
      <h2 className="text-2xl font-bold mb-6" style={{ color: "#292524" }}>
        Pricing Management
      </h2>

      {error && (
        <p className="text-red-600 text-sm mb-4 p-3 rounded-lg bg-red-50">{error}</p>
      )}
      {success && (
        <p className="text-green-600 text-sm mb-4 p-3 rounded-lg bg-green-50">{success}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="rounded-xl p-6 border"
            style={{
              backgroundColor: "#FAFAFA",
              borderColor: "#D4B896",
            }}
          >
            <h3 className="text-lg font-bold mb-2" style={{ color: "#292524" }}>
              {plan.name}
            </h3>
            <p className="text-sm mb-4" style={{ color: "#78614E" }}>
              {plan.period.replace("_", " ")}
            </p>

            {editingPlan === plan.id ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span style={{ color: "#292524" }}>$</span>
                  <input
                    type="number"
                    value={editingPrice}
                    onChange={(e) => setEditingPrice(parseFloat(e.target.value))}
                    disabled={plan.id === "free_test"}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    min="0"
                    step="0.01"
                  />
                  <span style={{ color: "#292524" }}>/month</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingPlan(null)}
                    className="flex-1 py-2 px-3 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSavePrice}
                    disabled={loading}
                    style={{
                      backgroundColor: "#F59E0B",
                      opacity: loading ? 0.7 : 1,
                    }}
                    className="flex-1 py-2 px-3 text-sm rounded-lg text-white font-medium hover:opacity-90 transition-opacity disabled:cursor-not-allowed"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p
                  className="text-3xl font-bold mb-4"
                  style={{ color: "#F59E0B" }}
                >
                  ${plan.price.toFixed(2)}
                </p>
                <button
                  onClick={() => handleEditClick(plan)}
                  disabled={plan.id === "free_test"}
                  className="w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: "rgba(245,158,11,0.1)",
                    color: "#F59E0B",
                  }}
                >
                  Edit Price
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-sm mt-6" style={{ color: "#78614E" }}>
        💡 Tip: Free test plan price cannot be changed. Lite and Pro plan prices affect only new signups using Stripe.
      </p>
    </div>
  );
}
