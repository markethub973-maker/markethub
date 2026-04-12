"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface User {
  id: string;
  email: string;
  name: string;
  plan: string;
}

interface ChangeUserPlanModalProps {
  user: User;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ChangeUserPlanModal({
  user,
  onClose,
  onSuccess,
}: ChangeUserPlanModalProps) {
  const [selectedPlan, setSelectedPlan] = useState(user.plan);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const plans = [
    { id: "free_test", name: "Starter", desc: "14-day trial" },
    { id: "lite", name: "Creator", desc: "$24/month" },
    { id: "pro", name: "Pro", desc: "$49/month" },
  ];

  const handleSubmit = async () => {
    if (selectedPlan === user.plan) {
      onClose();
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to update plan");
        return;
      }

      onSuccess();
    } catch (err) {
      setError("An error occurred");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className="rounded-2xl p-8 max-w-md w-full mx-4"
        style={{ backgroundColor: "#FFFCF7" }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold" style={{ color: "#292524" }}>
            Change Plan
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <p className="text-sm mb-4" style={{ color: "#78614E" }}>
          User: <span className="font-semibold">{user.email}</span>
        </p>

        <div className="space-y-3 mb-6">
          {plans.map((plan) => (
            <label
              key={plan.id}
              className="flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all"
              style={{
                borderColor: selectedPlan === plan.id ? "#F59E0B" : "#D4B896",
                backgroundColor:
                  selectedPlan === plan.id ? "rgba(245,158,11,0.1)" : "transparent",
              }}
            >
              <input
                type="radio"
                name="plan"
                value={plan.id}
                checked={selectedPlan === plan.id}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="mr-3"
              />
              <div className="flex-1">
                <p className="font-semibold" style={{ color: "#292524" }}>
                  {plan.name}
                </p>
                <p className="text-sm" style={{ color: "#78614E" }}>
                  {plan.desc}
                </p>
              </div>
            </label>
          ))}
        </div>

        {error && (
          <p className="text-red-600 text-sm mb-4">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 rounded-lg border border-gray-300 font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              backgroundColor: "#F59E0B",
              opacity: loading ? 0.7 : 1,
            }}
            className="flex-1 py-2 px-4 rounded-lg text-white font-medium hover:opacity-90 transition-opacity disabled:cursor-not-allowed"
          >
            {loading ? "Updating..." : "Update Plan"}
          </button>
        </div>
      </div>
    </div>
  );
}
