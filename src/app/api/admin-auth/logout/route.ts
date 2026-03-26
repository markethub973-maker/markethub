import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const response = NextResponse.json({
    success: true,
    message: "Logged out",
  });

  response.cookies.set({
    name: "admin_session",
    value: "",
    httpOnly: true,
    maxAge: 0,
  });

  return response;
}
