// E2E: insert 5 leads, then re-insert same 5 + 2 new ones, verify dedup.
// Plus first call should also dedup within batch (2 of the 5 are duplicates).
import { createClient } from "@supabase/supabase-js";
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PROD = "https://markethubpromo.com";
const supabase = createClient(SUPA_URL, SUPA_ANON);
const { data: auth } = await supabase.auth.signInWithPassword({ email: "markethub973@gmail.com", password: "MarketHub2026" });
const ref = SUPA_URL.match(/https:\/\/(\w+)\./)[1];
const cookie = `sb-${ref}-auth-token=base64-${Buffer.from(JSON.stringify(auth.session)).toString("base64")}`;
const call = async (p, m = "GET", b = null) => {
  const r = await fetch(PROD + p, { method: m, headers: { "Content-Type": "application/json", Cookie: cookie }, body: b ? JSON.stringify(b) : undefined });
  return { status: r.status, json: await r.json().catch(() => null) };
};

// Test 1: insert with intra-batch duplicates (should dedup within batch)
const u = `https://example-dedup-test-${Date.now()}.com`;
const seed1 = [
  { source: "research", lead_type: "website", name: "Test 1", url: u + "/page1", website: u + "/page1" },
  { source: "research", lead_type: "website", name: "Test 1 dup (same URL)", url: u + "/page1", website: u + "/page1" },
  { source: "research", lead_type: "website", name: "Test 1 dup (different case+slash)", url: (u + "/PAGE1/").toUpperCase(), website: (u + "/PAGE1/").toUpperCase() },
  { source: "research", lead_type: "website", name: "Test 2", url: u + "/page2", website: u + "/page2" },
  { source: "research", lead_type: "website", name: "Test 3", url: u + "/page3", website: u + "/page3" },
];
const ins1 = await call("/api/leads", "POST", seed1);
console.log("Insert 1 (5 leads, 2 are intra-batch dups):");
console.log(`  status=${ins1.status} count=${ins1.json?.count} skipped=${ins1.json?.skipped}`);
console.log(`  expected: count=3, skipped=2`);
const test1 = ins1.json?.count === 3 && ins1.json?.skipped === 2;
console.log(`  ${test1 ? "PASS" : "FAIL"}`);

// Test 2: re-insert same 3 + 2 new (should skip the 3 already in DB)
const seed2 = [
  { source: "research", lead_type: "website", name: "Test 1 again", url: u + "/page1", website: u + "/page1" },
  { source: "research", lead_type: "website", name: "Test 2 again", url: u + "/page2", website: u + "/page2" },
  { source: "research", lead_type: "website", name: "Test 3 again", url: u + "/page3", website: u + "/page3" },
  { source: "research", lead_type: "website", name: "Test 4 NEW", url: u + "/page4", website: u + "/page4" },
  { source: "research", lead_type: "website", name: "Test 5 NEW", url: u + "/page5", website: u + "/page5" },
];
const ins2 = await call("/api/leads", "POST", seed2);
console.log("\nInsert 2 (5 leads, 3 are cross-batch dups):");
console.log(`  status=${ins2.status} count=${ins2.json?.count} skipped=${ins2.json?.skipped}`);
console.log(`  expected: count=2, skipped=3`);
const test2 = ins2.json?.count === 2 && ins2.json?.skipped === 3;
console.log(`  ${test2 ? "PASS" : "FAIL"}`);

// Test 3: cleanup
const allIds = [...(ins1.json?.ids || []), ...(ins2.json?.ids || [])];
const del = await call("/api/leads", "DELETE", { ids: allIds });
console.log(`\nCleanup: deleted ${allIds.length} leads, status=${del.status}`);

const passed = (test1 ? 1 : 0) + (test2 ? 1 : 0);
console.log(`\nRESULT: ${passed}/2 passed`);
process.exit(passed === 2 ? 0 : 1);
