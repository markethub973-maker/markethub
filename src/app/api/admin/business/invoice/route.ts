import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { createServiceClient } from "@/lib/supabase/service";

// Returns invoice data as JSON — PDF rendered client-side via react-pdf
export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const clientId = req.nextUrl.searchParams.get("client_id");
  if (!clientId) return NextResponse.json({ error: "client_id required" }, { status: 400 });

  const supa = createServiceClient();
  const { data: client, error } = await supa
    .from("agency_clients")
    .select("*")
    .eq("id", clientId)
    .single();

  if (error || !client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const { data: adminProfile } = await supa
    .from("profiles")
    .select("name, email")
    .eq("is_admin", true)
    .limit(1)
    .single();

  // Generate invoice number: INV-YYYYMM-XXXX
  const now = new Date();
  const invoiceNo = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;
  const dueDate = new Date(now.getTime() + 14 * 24 * 3600 * 1000).toLocaleDateString("en-GB");

  return NextResponse.json({
    invoice: {
      number: invoiceNo,
      date: now.toLocaleDateString("en-GB"),
      due_date: dueDate,
      agency: {
        name: adminProfile?.name ?? "MarketHub Pro Agency",
        email: adminProfile?.email ?? process.env.ADMIN_EMAIL ?? "markethub973@gmail.com",
        website: "markethubpromo.com",
      },
      client: {
        name: client.name,
        company: client.company,
        email: client.email,
      },
      items: [
        {
          description: client.service || "Social Media Management Services",
          quantity: 1,
          unit_price: Number(client.monthly_value),
          total: Number(client.monthly_value),
        },
      ],
      subtotal: Number(client.monthly_value),
      tax: 0,
      total: Number(client.monthly_value),
      currency: "USD",
      notes: "Thank you for your business. Payment due within 14 days.",
    },
  });
}
