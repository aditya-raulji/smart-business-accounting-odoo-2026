// Middleware for Urban Furniture Accounting System.
// What: Intercepts every request and enforces role-based access control (RBAC) before
//       any page or server action handler runs.
// Why: Edge level par unauthorized requests block karna accidental exposure se bachata hai.
// RBAC Rules for CONTACT_USER:
// - Keval `/dashboard`, `/purchase/bills` (list) aur `/purchase/bills/[id]` (detail) access kar sakte hain.
// - `/purchase/bills/new`, `/purchase/orders`, `/payments`, `/accounting/*`, `/master/*` strictly blocked hain.
// Used by: Next.js edge runtime for all application routes.

import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const { auth } = NextAuth(authConfig);

const PUBLIC_ROUTES = ["/login", "/signup"];
const ADMIN_ONLY_ROUTES = ["/users/new", "/users"];

export default auth(async function middleware(req: NextRequest & { auth: any }) {
  const { pathname } = req.nextUrl;
  const session = (req as any).auth;

  // Never block Auth.js internal API endpoints
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Allow public routes without a session
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    if (session?.user) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // Require authentication for all other routes
  if (!session?.user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = session.user.role;

  // CONTACT_USER Scoping Rule (§6)
  // Keval /dashboard, /purchase/bills (list) aur /purchase/bills/[id] (detail view) ki ijazat hai.
  // /purchase/bills/new, /purchase/orders, /payments, /accounting, /master blocked hain.
  if (role === "CONTACT_USER") {
    const isDashboard = pathname.startsWith("/dashboard");
    const isMyRoute = pathname.startsWith("/my-");
    const isVendorBillView =
      pathname === "/purchase/bills" ||
      (pathname.startsWith("/purchase/bills/") && pathname !== "/purchase/bills/new");

    if (!isDashboard && !isMyRoute && !isVendorBillView) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // ADMIN-only routes: reject ACCOUNTANT users with a redirect to dashboard
  if (ADMIN_ONLY_ROUTES.some((route) => pathname.startsWith(route))) {
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
