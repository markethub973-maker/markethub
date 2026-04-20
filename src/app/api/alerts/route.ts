import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAuth } from "@/lib/route-helpers";

// GET — fetch user's metric_alerts + alert_events
export async function GET() {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const supabase = await createClient();

    const [alertsRes, eventsRes] = await Promise.all([
      supabase
        .from("metric_alerts")
        .select("*")
        .eq("user_id", auth.userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("alert_events")
        .select("*")
        .eq("user_id", auth.userId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    return NextResponse.json({
      rules: alertsRes.data ?? [],
      events: eventsRes.data ?? [],
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal error" },
      { status: 500 },
    );
  }
}

// POST — create a new metric alert rule
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const svc = createServiceClient();

    const { data, error } = await svc
      .from("metric_alerts")
      .insert({
        user_id: auth.userId,
        metric: body.metric,
        condition: body.condition,
        threshold: body.threshold,
        email: body.email || null,
        active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal error" },
      { status: 500 },
    );
  }
}

// DELETE — delete a metric alert rule by id
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Missing alert id" }, { status: 400 });
    }

    const svc = createServiceClient();

    // Delete associated events first
    await svc
      .from("alert_events")
      .delete()
      .eq("alert_id", id)
      .eq("user_id", auth.userId);

    const { error } = await svc
      .from("metric_alerts")
      .delete()
      .eq("id", id)
      .eq("user_id", auth.userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal error" },
      { status: 500 },
    );
  }
}

// PATCH — update alert (e.g. toggle active, update last_triggered_at)
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ error: "Missing alert id" }, { status: 400 });
    }

    const svc = createServiceClient();

    const { data, error } = await svc
      .from("metric_alerts")
      .update(updates)
      .eq("id", id)
      .eq("user_id", auth.userId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal error" },
      { status: 500 },
    );
  }
}
