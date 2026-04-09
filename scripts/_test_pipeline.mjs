// E2E: insert a lead, walk it through every pipeline stage, verify each
// PATCH lands, verify GET reflects state, verify invalid stages are rejected.
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

const u = `https://pipeline-test-${Date.now()}.com`;
const ins = await call("/api/leads", "POST", [{ source: "research", lead_type: "website", name: "Pipeline test", url: u, website: u }]);
const id = ins.json?.ids?.[0];
console.log(`Inserted: id=${id?.slice(0,8)} count=${ins.json?.count}`);

let pass = 0, fail = 0;

// Test: default stage should be 'new'
const get1 = await call("/api/leads?limit=200");
const lead1 = (get1.json?.leads || []).find(l => l.id === id);
const test1 = lead1?.pipeline_status === "new";
console.log(`Default stage = "new"? ${lead1?.pipeline_status} ${test1 ? "PASS" : "FAIL"}`);
test1 ? pass++ : fail++;

// Test: walk through every valid stage
for (const stage of ["contacted", "replied", "interested", "client", "lost"]) {
  const r = await call("/api/leads", "PATCH", { id, pipeline_status: stage });
  const get = await call("/api/leads?limit=200");
  const lead = (get.json?.leads || []).find(l => l.id === id);
  const ok = r.status === 200 && lead?.pipeline_status === stage;
  console.log(`PATCH stage=${stage.padEnd(12)} → DB=${lead?.pipeline_status?.padEnd(12)} ${ok ? "PASS" : "FAIL"}`);
  ok ? pass++ : fail++;
}

// Test: invalid stage should be rejected
const bad = await call("/api/leads", "PATCH", { id, pipeline_status: "garbage" });
const test_reject = bad.status === 400;
console.log(`Reject invalid stage "garbage"? status=${bad.status} ${test_reject ? "PASS" : "FAIL"}`);
test_reject ? pass++ : fail++;

// Test: SQL injection attempt should be rejected
const inj = await call("/api/leads", "PATCH", { id, pipeline_status: "client'; DROP TABLE--" });
const test_inj = inj.status === 400;
console.log(`Reject SQL injection attempt? status=${inj.status} ${test_inj ? "PASS" : "FAIL"}`);
test_inj ? pass++ : fail++;

// Cleanup
await call("/api/leads", "DELETE", { ids: [id] });
console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
