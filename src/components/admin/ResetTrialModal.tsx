"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface User {
  id: string;
  email: string;
  name: string;
}

interface ResetTrialModalProps {
  user: User;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ResetTrialModal({
  user,
  onClose,
  onSuccess,
}: ResetTrialModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleReset = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/users/${user.id}/reset-trial`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to reset trial");
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
            Reset Trial
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

        <div
          className="p-4 rounded-lg mb-6"
          style={{ backgroundColor: "rgba(245,158,11,0.1)" }}
        >
          <p style={{ color: "#292524" }} className="text-sm">
            This will give the user a new 7-day trial period. Their trial expiration date will be reset to 7 days from now.
          </p>
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
            onClick={handleReset}
            disabled={loading}
            style={{
              backgroundColor: "#10B981",
              opacity: loading ? 0.7 : 1,
            }}
            className="flex-1 py-2 px-4 rounded-lg text-white font-medium hover:opacity-90 transition-opacity disabled:cursor-not-allowed"
          >
            {loading ? "Resetting..." : "Reset Trial"}
          </button>
        </div>
      </div>
    </div>
  );
}
