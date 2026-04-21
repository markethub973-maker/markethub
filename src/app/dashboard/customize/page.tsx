"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import AgentCustomizer from "@/components/customize/AgentCustomizer";
import QuickToolsCustomizer from "@/components/customize/QuickToolsCustomizer";
import WhiteLabelCustomizer from "@/components/customize/WhiteLabelCustomizer";
import BrainPreferences from "@/components/customize/BrainPreferences";
import { getPlanLimits } from "@/lib/plan-limits";
import { Lock, Bot, Zap, Globe, Brain, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type TabId = "quick-tools" | "brain" | "agents" | "white-label";

interface TabDef {
  id: TabId;
  label: string;
  icon: React.ElementType;
  requiresPlan?: "pro" | "agency";
}

const TABS: TabDef[] = [
  { id: "quick-tools", label: "Quick Tools", icon: Zap },
  { id: "brain", label: "Brain Preferences", icon: Brain },
  { id: "agents", label: "Agents", icon: Bot, requiresPlan: "pro" },
  { id: "white-label", label: "White Label", icon: Globe, requiresPlan: "agency" },
];

function UpgradeGate({ requiredPlan }: { requiredPlan: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ backgroundColor: "rgba(245,158,11,0.1)" }}>
        <Lock className="w-8 h-8" style={{ color: "var(--color-primary)" }} />
      </div>
      <h3 className="text-lg font-bold mb-2" style={{ color: "var(--color-text)" }}>
        {requiredPlan === "agency" ? "Agency" : "Pro"} Plan Required
      </h3>
      <p className="text-sm mb-6 max-w-sm" style={{ color: "#78614E" }}>
        Upgrade to the {requiredPlan === "agency" ? "Agency" : "Pro"} plan to unlock this feature
        and take full control of your platform.
      </p>
      <Link href="/dashboard/billing"
        className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all"
        style={{
          backgroundColor: "var(--color-primary)",
          color: "white",
        }}>
        Upgrade Now
      </Link>
    </div>
  );
}

export default function CustomizePage() {
  const [activeTab, setActiveTab] = useState<TabId>("quick-tools");
  const [userPlan, setUserPlan] = useState<string>("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlan = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("subscription_plan")
          .eq("id", user.id)
          .single();
        setUserPlan(profile?.subscription_plan ?? "free");
      }
      setLoading(false);
    };
    fetchPlan();
  }, []);

  const limits = getPlanLimits(userPlan);
  const canAccessAgents = limits.custom_agents;
  const canAccessWhiteLabel = limits.white_label;

  const isTabLocked = (tab: TabDef): boolean => {
    if (tab.requiresPlan === "pro" && !canAccessAgents) return true;
    if (tab.requiresPlan === "agency" && !canAccessWhiteLabel) return true;
    return false;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FAFAF8" }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--color-primary)" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAFAF8" }}>
      <Header title="Customize" subtitle="Personalize your workspace, tools, and AI behavior" />

      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        {/* Tabs — horizontal on desktop, vertical on mobile */}
        <div className="flex flex-col sm:flex-row gap-2 mb-6">
          {TABS.map((tab) => {
            const locked = isTabLocked(tab);
            const active = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all w-full sm:w-auto"
                style={{
                  backgroundColor: active ? "rgba(245,158,11,0.12)" : "white",
                  color: active ? "var(--color-primary)" : "#78614E",
                  border: active
                    ? "1px solid rgba(245,158,11,0.4)"
                    : "1px solid rgba(245,215,160,0.25)",
                }}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {locked && <Lock className="w-3 h-3 ml-1 opacity-50" />}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div>
          {activeTab === "quick-tools" && <QuickToolsCustomizer />}
          {activeTab === "brain" && <BrainPreferences />}
          {activeTab === "agents" && (
            canAccessAgents ? <AgentCustomizer /> : <UpgradeGate requiredPlan="pro" />
          )}
          {activeTab === "white-label" && (
            canAccessWhiteLabel ? <WhiteLabelCustomizer /> : <UpgradeGate requiredPlan="agency" />
          )}
        </div>
      </div>
    </div>
  );
}
