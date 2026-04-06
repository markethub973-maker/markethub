/**
 * /api/admin/restore
 * Triggers a Vercel redeploy of the last READY production deployment.
 * Used by the admin dashboard "Restore" button.
 */
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";

const VERCEL_TOKEN = process.env.VERCEL_API_TOKEN!;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID ?? "prj_HHkmEIEiIRuoyCFT22KAobqzUwaH";
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID ?? "team_rbNwqamitZzxEBwrd9UMDlxk";

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));

  if (!VERCEL_TOKEN) {
    return NextResponse.json({ error: "VERCEL_API_TOKEN not configured" }, { status: 500 });
  }

  try {
    // Get the last READY production deployment (before the current one if specified)
    const listRes = await fetch(
      `https://api.vercel.com/v6/deployments?projectId=${VERCEL_PROJECT_ID}&teamId=${VERCEL_TEAM_ID}&limit=5&state=READY&target=production`,
      { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
    );
    if (!listRes.ok) {
      return NextResponse.json({ error: `Vercel API error: HTTP ${listRes.status}` }, { status: 502 });
    }
    const { deployments } = await listRes.json();
    if (!deployments?.length) {
      return NextResponse.json({ error: "No ready deployments found" }, { status: 404 });
    }

    // Use the most recent READY deployment (or the one before current if body.skipLatest)
    const target = body.skipLatest && deployments.length > 1 ? deployments[1] : deployments[0];

    const redeployRes = await fetch(
      `https://api.vercel.com/v13/deployments?teamId=${VERCEL_TEAM_ID}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deploymentId: target.uid,
          name: "viralstat-dashboard",
          target: "production",
        }),
      }
    );

    if (!redeployRes.ok) {
      const errText = await redeployRes.text();
      return NextResponse.json(
        { error: `Redeploy failed: ${errText.slice(0, 300)}` },
        { status: 502 }
      );
    }

    const result = await redeployRes.json();
    return NextResponse.json({
      ok: true,
      message: "Redeploy triggered successfully",
      sourceDeployment: { id: target.uid, url: target.url, createdAt: target.createdAt },
      newDeploymentId: result.id,
      inspectorUrl: result.inspectorUrl,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET — returns last 5 deployments so admin can choose which one to restore
export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!VERCEL_TOKEN) {
    return NextResponse.json({ error: "VERCEL_API_TOKEN not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://api.vercel.com/v6/deployments?projectId=${VERCEL_PROJECT_ID}&teamId=${VERCEL_TEAM_ID}&limit=5&state=READY&target=production`,
      { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
    );
    if (!res.ok) return NextResponse.json({ error: `HTTP ${res.status}` }, { status: 502 });
    const { deployments } = await res.json();
    return NextResponse.json({
      deployments: (deployments ?? []).map((d: any) => ({
        id: d.uid,
        url: d.url,
        createdAt: d.createdAt,
        state: d.state,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
