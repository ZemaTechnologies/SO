import { NextResponse, type NextRequest } from "next/server";

// Toutes les pages sont protégées par mot de passe, sauf la connexion, les aperçus publics et les tâches planifiées.
const PUBLIC = [/^\/login/, /^\/api\/login/, /^\/p\//, /^\/api\/run/, /^\/_next\//, /^\/favicon/, /^\/logo/];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((r) => r.test(pathname))) return NextResponse.next();
  const token = process.env.APP_SESSION_TOKEN;
  if (token && req.cookies.get("so_session")?.value === token) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = { matcher: ["/((?!_next/static|_next/image).*)"] };
