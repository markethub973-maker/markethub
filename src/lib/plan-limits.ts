export const PLAN_LIMITS = {
  free: {
    projects_active: 1,
    workflow_modes: ["auto"] as string[],
    ai_brain_personal: false,
    uniqueness_guarantee: false,
    quick_tools_access: true,
    white_label: false,
    custom_agents: false,
  },
  starter: {
    projects_active: 1,
    workflow_modes: ["auto"] as string[],
    ai_brain_personal: false,
    uniqueness_guarantee: false,
    quick_tools_access: true,
    white_label: false,
    custom_agents: false,
  },
  creator: {
    projects_active: 3,
    workflow_modes: ["auto", "semi", "guided"] as string[],
    ai_brain_personal: false,
    uniqueness_guarantee: true,
    quick_tools_access: true,
    white_label: false,
    custom_agents: false,
  },
  pro: {
    projects_active: 10,
    workflow_modes: ["auto", "semi", "guided"] as string[],
    ai_brain_personal: true,
    uniqueness_guarantee: true,
    quick_tools_access: true,
    white_label: false,
    custom_agents: true,
  },
  business: {
    projects_active: 50,
    workflow_modes: ["auto", "semi", "guided"] as string[],
    ai_brain_personal: true,
    uniqueness_guarantee: true,
    quick_tools_access: true,
    white_label: false,
    custom_agents: true,
  },
  agency: {
    projects_active: -1, // unlimited
    workflow_modes: ["auto", "semi", "guided"] as string[],
    ai_brain_personal: true,
    uniqueness_guarantee: true,
    quick_tools_access: true,
    white_label: true,
    custom_agents: true,
  },
} as const;

export type PlanName = keyof typeof PLAN_LIMITS;

export function getPlanLimits(plan: string) {
  return PLAN_LIMITS[plan as PlanName] || PLAN_LIMITS.free;
}

export function canCreateProject(plan: string, currentActiveCount: number): boolean {
  const limits = getPlanLimits(plan);
  if (limits.projects_active === -1) return true;
  return currentActiveCount < limits.projects_active;
}

export function canUseWorkflowMode(plan: string, mode: string): boolean {
  const limits = getPlanLimits(plan);
  return limits.workflow_modes.includes(mode);
}

export function hasFeature(plan: string, feature: keyof typeof PLAN_LIMITS.free): boolean {
  const limits = getPlanLimits(plan);
  return !!limits[feature];
}
