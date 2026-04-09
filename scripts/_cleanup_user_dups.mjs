// Find duplicate research_leads for the test user (same normalized URL,
// same user_id) and delete the newer ones, keeping the earliest insert.
import { createClient } from "@supabase/supabase-js";
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPA_URL, SVC, { auth: { persistSession: false } });

function normalize(u) {
  if (!u) return "";
  try {
    const hasScheme = /^https?:\/\//i.test(u);
    const url = new URL(hasScheme ? u : "https://" + u);
    const host = url.hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");
    const path = url.pathname.replace(/\/+$/, "").toLowerCase();
    return host + path;
  } catch { return u.toLowerCase(); }
}

// Pull markethub973 user id
const { data: profiles } = await supabase.from("profiles").select("id, email").eq("email", "markethub973@gmail.com");
const userId = profiles?.[0]?.id;
if (!userId) { console.error("user not found"); process.exit(1); }
console.log("User:", userId);

const { data: leads, error } = await supabase
  .from("research_leads")
  .select("id, url, website, name, lead_type, created_at")
  .eq("user_id", userId)
  .order("created_at", { ascending: true });

if (error) { console.error(error); process.exit(1); }
console.log(`Total leads: ${leads.length}`);

const byKey = new Map();
const toDelete = [];
for (const l of leads) {
  const key = normalize(l.url) || normalize(l.website);
  if (!key) continue;
  if (byKey.has(key)) {
    toDelete.push({ id: l.id, name: l.name, url: l.url, kept: byKey.get(key) });
  } else {
    byKey.set(key, l.id);
  }
}

console.log(`\nDuplicates to delete (${toDelete.length}):\n`);
for (const d of toDelete) {
  console.log(`  [${d.id.slice(0,8)}] ${d.name?.slice(0,50).padEnd(50)} ← ${d.url?.slice(0,55)}`);
}

if (process.argv.includes("--apply")) {
  const ids = toDelete.map(d => d.id);
  if (!ids.length) { console.log("Nothing to delete"); process.exit(0); }
  const { error: de } = await supabase.from("research_leads").delete().in("id", ids).eq("user_id", userId);
  if (de) { console.error("delete failed:", de); process.exit(1); }
  console.log(`\nDeleted ${ids.length} duplicates. ${leads.length - ids.length} unique leads remain.`);
} else {
  console.log("\nDRY RUN — pass --apply to actually delete");
}
