import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

export async function POST(req: Request) {
  const form = await req.formData();
  const given = Buffer.from(String(form.get("password") ?? ""));
  const expected = Buffer.from(process.env.APP_PASSWORD ?? "");
  const ok = expected.length > 0 && given.length === expected.length && timingSafeEqual(given, expected);
  if (!ok) return NextResponse.redirect(new URL("/login?erreur=1", req.url), 303);
  const res = NextResponse.redirect(new URL("/", req.url), 303);
  res.cookies.set("so_session", process.env.APP_SESSION_TOKEN ?? "", {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
