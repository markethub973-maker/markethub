"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import ChangeUserPlanModal from "./ChangeUserPlanModal";
import ResetTrialModal from "./ResetTrialModal";

interface User {
  id: string;
  email: string;
  name: string;
  plan: string;
  subscription_status: string;
  trial_expires_at: string | null;
  created_at: string;
  total_api_cost_month: number;
}

interface AdminUsersTableProps {
  users: User[];
  onUserUpdate: () => void;
}

export default function AdminUsersTable({
  users,
  onUserUpdate,
}: AdminUsersTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalType, setModalType] = useState<"plan" | "trial" | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "plan" | "created">
("created");

  const filteredUsers = users
    .filter(
      (u) =>
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "plan") return a.plan.localeCompare(b.plan);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case "free_test":
        return { bg: "#FEF3C7", color: "#F59E0B" };
      case "lite":
        return { bg: "#D1FAE5", color: "#10B981" };
      case "pro":
        return { bg: "#DDD6FE", color: "#6366F1" };
      default:
        return { bg: "#F3F4F6", color: "#6B7280" };
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
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4" style={{ color: "#292524" }}>
          Users Management
        </h2>
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Search by email or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as "name" | "plan" | "created")
            }
            className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="created">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="plan">Sort by Plan</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold" style={{ color: "#292524" }}>
                Email
              </th>
              <th className="text-left py-3 px-4 font-semibold" style={{ color: "#292524" }}>
                Name
              </th>
              <th className="text-left py-3 px-4 font-semibold" style={{ color: "#292524" }}>
                Plan
              </th>
              <th className="text-left py-3 px-4 font-semibold" style={{ color: "#292524" }}>
                Status
              </th>
              <th className="text-left py-3 px-4 font-semibold" style={{ color: "#292524" }}>
                API Cost
              </th>
              <th className="text-left py-3 px-4 font-semibold" style={{ color: "#292524" }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => {
              const badgeColor = getPlanBadgeColor(user.plan);
              const trialDaysLeft = user.trial_expires_at
                ? Math.ceil(
                    (new Date(user.trial_expires_at).getTime() -
                      new Date().getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                : null;

              return (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4" style={{ color: "#292524" }}>
                    <a
                      href={`mailto:${user.email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {user.email}
                    </a>
                  </td>
                  <td className="py-4 px-4" style={{ color: "#292524" }}>
                    {user.name}
                  </td>
                  <td className="py-4 px-4">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-semibold capitalize"
                      style={{
                        backgroundColor: badgeColor.bg,
                        color: badgeColor.color,
                      }}
                    >
                      {user.plan.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div style={{ color: "#78614E" }}>
                      <p className="text-xs font-medium">{user.subscription_status}</p>
                      {user.plan === "free_test" && trialDaysLeft !== null && (
                        <p className="text-xs">{trialDaysLeft} days left</p>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4" style={{ color: "#292524" }}>
                    ${user.total_api_cost_month.toFixed(2)}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setModalType("plan");
                        }}
                        className="px-3 py-1 text-xs rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
                      >
                        Change Plan
                      </button>
                      {user.plan === "free_test" && (
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setModalType("trial");
                          }}
                          className="px-3 py-1 text-xs rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                        >
                          Reset Trial
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-sm mt-4" style={{ color: "#78614E" }}>
        Total users: {filteredUsers.length} of {users.length}
      </p>

      {/* Modals */}
      {modalType === "plan" && selectedUser && (
        <ChangeUserPlanModal
          user={selectedUser}
          onClose={() => {
            setModalType(null);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            setModalType(null);
            setSelectedUser(null);
            onUserUpdate();
          }}
        />
      )}

      {modalType === "trial" && selectedUser && (
        <ResetTrialModal
          user={selectedUser}
          onClose={() => {
            setModalType(null);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            setModalType(null);
            setSelectedUser(null);
            onUserUpdate();
          }}
        />
      )}
    </div>
  );
}
