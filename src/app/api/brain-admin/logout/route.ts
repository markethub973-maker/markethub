import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.redirect("https://brain.markethubpromo.com/", { status: 303 });
  res.cookies.set("brain_admin", "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    domain: ".markethubpromo.com",
  });
  return res;
}
