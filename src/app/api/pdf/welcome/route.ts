import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { WelcomePDF } from "@/lib/pdfTemplate";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("name, plan")
      .eq("id", user.id)
      .single();

    const name = profile?.name || req.nextUrl.searchParams.get("name") || user.email?.split("@")[0] || "Client";
    const plan = profile?.plan ? plan_label(profile.plan) : "Pro";
    const date = new Date().toLocaleDateString("en-US", { day: "2-digit", month: "long", year: "numeric" });

    const element = createElement(WelcomePDF, { name, email: user.email || "", plan, date });
    const buffer = await renderToBuffer(element as any);

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="MarketHub-Pro-Setup-${name.replace(/\s+/g, "-")}.pdf"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function plan_label(plan: string) {
  const map: Record<string, string> = { free: "Free Plan", pro: "Pro Plan", enterprise: "Enterprise Plan" };
  return map[plan] || "Pro Plan";
}
