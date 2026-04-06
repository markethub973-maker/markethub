"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut } from "lucide-react";
import Header from "@/components/layout/Header";
import AdminStatsCard from "@/components/admin/AdminStatsCard";
import AdminUsersTable from "@/components/admin/AdminUsersTable";
import AdminPricingPanel from "@/components/admin/AdminPricingPanel";
import AdminAnalyticsChart from "@/components/admin/AdminAnalyticsChart";
import AdminBuyerPersona from "@/components/admin/AdminBuyerPersona";
import AdminFeatureProgress from "@/components/admin/AdminFeatureProgress";
import AdminCredentials from "@/components/admin/AdminCredentials";
import AdminPlatformConnect from "@/components/admin/AdminPlatformConnect";
import AdminAnthropicUsage from "@/components/admin/AdminAnthropicUsage";
import AdminTokenStatus from "@/components/admin/AdminTokenStatus";
import AdminTokensPanel from "@/components/admin/AdminTokensPanel";
import AdminFeatureFlagsPanel from "@/components/admin/AdminFeatureFlagsPanel";
import AdminDiscountCodesPanel from "@/components/admin/AdminDiscountCodesPanel";
import AdminHealthCheck from "@/components/admin/AdminHealthCheck";
import AdminTestRunner from "@/components/admin/AdminTestRunner";
import AdminRestorePanel from "@/components/admin/AdminRestorePanel";
import { ModuleBoundary } from "@/components/ModuleBoundary";

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [adminAccess, setAdminAccess] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRevenue: 0,
    activeSubscriptions: 0,
    freeTrials: 0,
  });
  const [users, setUsers] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [period, setPeriod] = useState("monthly");

  useEffect(() => {
    checkAdminAccess();
    fetchData();
    runMigrationSilently();
  }, []);

  // Auto-run migration on every admin load (idempotent — only applies missing steps)
  const runMigrationSilently = async () => {
    try {
      // Auth via httpOnly admin_session_token cookie — no token in headers needed
      await fetch("/api/admin/run-migration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } catch { /* silent */ }
  };

  const checkAdminAccess = async () => {
    try {
      // Check for admin authentication token in localStorage
      if (typeof window !== "undefined") {
        const adminAuth = localStorage.getItem("admin_authenticated");
        if (!adminAuth) {
          router.push("/markethub973");
          setAdminAccess(false);
          setLoading(false);
          return;
        }
      }
      setAdminAccess(true);
      setLoading(false);
    } catch (error) {
      console.error("Admin check error:", error);
      router.push("/markethub973");
      setAdminAccess(false);
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      // Fetch users
      const usersRes = await fetch("/api/admin/users");
      const usersData = await usersRes.json();
      if (usersData.success) {
        setUsers(usersData.users);
      }

      // Fetch analytics
      const analyticsRes = await fetch(`/api/admin/analytics?period=${period}`);
      const analyticsData = await analyticsRes.json();
      if (analyticsData.success) {
        setAnalyticsData(analyticsData);
        const subs = analyticsData.summary.active_subscriptions;
        setStats({
          totalUsers: analyticsData.summary.total_users,
          totalRevenue: analyticsData.summary.total_revenue,
          activeSubscriptions:
            (subs.starter || 0) + (subs.lite || 0) + (subs.pro || 0) +
            (subs.business || 0) + (subs.enterprise || 0),
          freeTrials: subs.free_test || 0,
        });
      }

      setLoading(false);
    } catch (error) {
      console.error("Fetch error:", error);
      setLoading(false);
    }
  };

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    fetchAnalytics(newPeriod);
  };

  const fetchAnalytics = async (selectedPeriod: string) => {
    try {
      const response = await fetch(`/api/admin/analytics?period=${selectedPeriod}`);
      const data = await response.json();
      if (data.success) {
        setAnalyticsData(data);
      }
    } catch (error) {
      console.error("Fetch analytics error:", error);
    }
  };

  const handleUserUpdate = () => {
    fetchData();
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/admin-auth/logout", { method: "POST" });
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  if (!adminAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-xl font-semibold text-red-600">Access Denied</p>
        <p className="text-gray-600">You do not have admin access.</p>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Admin Dashboard"
        subtitle="Manage users, subscriptions, and pricing"
      />
      <div className="absolute top-6 right-6 z-30">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors"
          style={{
            backgroundColor: "rgba(239,68,68,0.1)",
            color: "#EF4444",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.1)";
          }}
        >
          <LogOut size={18} />
          Logout Admin
        </button>
      </div>
      <div className="p-6 space-y-8">

        {/* ── Security: Restore & Health Monitor ───────────────────────── */}
        <ModuleBoundary name="Restore & Health Monitor" minimal>
          <AdminRestorePanel />
        </ModuleBoundary>

        {/* ── Health Check Agent ────────────────────────────────────────── */}
        <ModuleBoundary name="Health Check" minimal>
          <AdminHealthCheck />
        </ModuleBoundary>

        {/* ── Integration Test Agent ───────────────────────────────────── */}
        <ModuleBoundary name="Integration Tests" minimal>
          <AdminTestRunner />
        </ModuleBoundary>

        {/* ── Preview Features ──────────────────────────────────────────── */}
        <div className="rounded-2xl p-4 flex items-center gap-4 flex-wrap"
          style={{ backgroundColor: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.15)" }}>
          <div className="flex items-center gap-2">
            <span className="text-base">🧪</span>
            <p className="text-sm font-bold" style={{ color: "#7C3AED" }}>Preview Admin — Features în testare</p>
          </div>
          <Link href="/dashboard/admin/lead-wizard"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
            style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.25)" }}>
            🎯 Lead Generation Wizard
          </Link>
          <Link href="/dashboard/admin/users"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
            style={{ backgroundColor: "rgba(22,163,74,0.1)", color: "#16A34A", border: "1px solid rgba(22,163,74,0.25)" }}>
            👥 Users & Revenue
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <AdminStatsCard
            title="Total Users"
            value={stats.totalUsers}
            change="+12%"
            icon="👥"
          />
          <AdminStatsCard
            title="Monthly Revenue"
            value={`$${stats.totalRevenue.toFixed(2)}`}
            change="+8%"
            icon="💰"
          />
          <AdminStatsCard
            title="Active Subscriptions"
            value={stats.activeSubscriptions}
            change="+5%"
            icon="✅"
          />
          <AdminStatsCard
            title="Free Trials"
            value={stats.freeTrials}
            change="-2%"
            icon="🎁"
          />
        </div>

        {/* Anthropic API Usage */}
        <ModuleBoundary name="Anthropic Usage" minimal>
          <AdminAnthropicUsage />
        </ModuleBoundary>

        {/* Token & API Key Status */}
        <ModuleBoundary name="Token Status" minimal>
          <AdminTokenStatus />
        </ModuleBoundary>

        {/* Analytics Section */}
        <div
          className="rounded-2xl p-8"
          style={{
            backgroundColor: "#FFFCF7",
            border: "1px solid rgba(245,215,160,0.25)",
          }}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold" style={{ color: "#292524" }}>
              Revenue Analytics
            </h2>
            <div className="flex gap-2">
              {["daily", "weekly", "monthly"].map((p) => (
                <button
                  key={p}
                  onClick={() => handlePeriodChange(p)}
                  className={`px-4 py-2 rounded-lg capitalize font-medium transition-all ${
                    period === p
                      ? "bg-amber-400 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          {analyticsData && <AdminAnalyticsChart data={analyticsData} />}
        </div>

        {/* Users Table */}
        <ModuleBoundary name="Users Table" minimal>
          <AdminUsersTable users={users} onUserUpdate={handleUserUpdate} />
        </ModuleBoundary>

        {/* Buyer Persona Builder */}
        <ModuleBoundary name="Buyer Persona" minimal>
          <AdminBuyerPersona />
        </ModuleBoundary>

        {/* Feature Progress Tracker */}
        <ModuleBoundary name="Feature Progress" minimal>
          <AdminFeatureProgress />
        </ModuleBoundary>

        {/* Platform Auto-Connect (admin only) */}
        <ModuleBoundary name="Platform Connect" minimal>
          <AdminPlatformConnect />
        </ModuleBoundary>

        {/* API Credentials */}
        <ModuleBoundary name="Credentials" minimal>
          <AdminCredentials />
        </ModuleBoundary>

        {/* Pricing Management */}
        <ModuleBoundary name="Pricing Panel" minimal>
          <AdminPricingPanel />
        </ModuleBoundary>

        {/* Token Allocation per Plan */}
        <ModuleBoundary name="Tokens Panel" minimal>
          <AdminTokensPanel />
        </ModuleBoundary>

        {/* Feature Flags per Plan */}
        <ModuleBoundary name="Feature Flags" minimal>
          <AdminFeatureFlagsPanel />
        </ModuleBoundary>

        {/* Discount Codes */}
        <ModuleBoundary name="Discount Codes" minimal>
          <AdminDiscountCodesPanel />
        </ModuleBoundary>
      </div>
    </div>
  );
}
