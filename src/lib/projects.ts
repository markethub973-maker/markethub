import { createClient } from "@/lib/supabase/client";

export type ProjectStatus = "active" | "completed" | "archived";

export interface Project {
  id: string;
  user_id: string;
  client_id?: string;
  name: string;
  objective?: string;
  status: ProjectStatus;
  start_date: string;
  deadline?: string;
  platforms: string[];
  color: string;
  created_at: string;
  updated_at: string;
}

export async function getProjects(status?: ProjectStatus): Promise<Project[]> {
  const supabase = createClient();
  let q = supabase.from("projects").select("*").order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createProject(payload: Partial<Project>): Promise<Project> {
  const supabase = createClient();
  // Ensure user_id is set — required by RLS policy
  if (!payload.user_id) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    payload.user_id = user.id;
  }
  const { data, error } = await supabase.from("projects").insert(payload).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateProject(id: string, payload: Partial<Project>): Promise<void> {
  const supabase = createClient();
  await supabase.from("projects").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", id);
}

export async function completeProject(id: string): Promise<void> {
  await updateProject(id, { status: "completed" });
}

export async function archiveProject(id: string): Promise<void> {
  await updateProject(id, { status: "archived" });
}

export async function getActiveProjectsCount(): Promise<number> {
  const supabase = createClient();
  const { count } = await supabase.from("projects").select("id", { count: "exact", head: true }).eq("status", "active");
  return count ?? 0;
}
