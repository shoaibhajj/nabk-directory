import { NextResponse, type NextRequest } from "next/server";

// Lightweight middleware reserved for future edge-safe checks (e.g. locale).
// Authn/Authz is enforced inside server components via `auth()` from
// "@/lib/auth" — Auth.js v5 JWT decoding is not edge-safe with the current
// callback (Prisma access), so we keep middleware as a pass-through.
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
