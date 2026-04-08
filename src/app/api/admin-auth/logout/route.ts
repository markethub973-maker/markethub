import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const response = NextResponse.json({
    success: true,
    message: "Logged out",
  });

  response.cookies.set({
    name: "admin_session_token",
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });

  return response;
}
