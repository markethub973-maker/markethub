import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// GET — list all clients belonging to this reseller
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    // Verify reseller role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "reseller") {
      return NextResponse.json({ error: "Access denied. Reseller role required." }, { status: 403 });
    }

    // Fetch clients linked to this reseller
    const { data: clients, error } = await supabase
      .from("profiles")
      .select("id, name, email, instagram_handle, subscription_plan, created_at, updated_at")
      .eq("reseller_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[reseller/clients] query error:", error.message);
      return NextResponse.json({ error: "Failed to fetch clients." }, { status: 500 });
    }

    return NextResponse.json({ clients: clients || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[reseller/clients] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST — add a new client for this reseller
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    // Verify reseller role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "reseller") {
      return NextResponse.json({ error: "Access denied. Reseller role required." }, { status: 403 });
    }

    const { name, email, instagram } = await req.json();

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
    }

    const serviceSupabase = createServiceClient();

    // Create auth user for the client (with a random password they can reset)
    const tempPassword = `MH_${crypto.randomUUID().slice(0, 12)}!`;
    const { data: authUser, error: authError } = await serviceSupabase.auth.admin.createUser({
      email: email.trim(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name: name.trim() },
    });

    if (authError) {
      if (authError.message?.includes("already") || authError.message?.includes("exists")) {
        return NextResponse.json(
          { error: "A user with this email already exists." },
          { status: 409 }
        );
      }
      console.error("[reseller/clients] auth error:", authError.message);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const clientId = authUser.user.id;

    // Update the client profile: link to reseller, set instagram handle
    const updateData: Record<string, unknown> = {
      reseller_id: user.id,
      name: name.trim(),
    };
    if (instagram?.trim()) {
      updateData.instagram_handle = instagram.trim().replace(/^@/, "");
    }

    const { error: updateError } = await serviceSupabase
      .from("profiles")
      .update(updateData)
      .eq("id", clientId);

    if (updateError) {
      console.error("[reseller/clients] profile update error:", updateError.message);
      return NextResponse.json({ error: "User created but profile update failed." }, { status: 500 });
    }

    return NextResponse.json({
      client: { id: clientId, name: name.trim(), email: email.trim() },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[reseller/clients] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
