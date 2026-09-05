// Middleware for Urban Furniture Accounting System.
// What: Intercepts every request and enforces role-based access control (RBAC) before
//       any page or server action handler runs.
// Why: Putting RBAC in middleware means protection is applied at the edge — a request to
//      an admin-only route never reaches the React component or server action if the token
//      doesn't have the right role. This prevents accidental exposure via direct URL access.
// Why not: Checking auth inside each server component/action would work but is error-prone
//          (easy to forget one check) and doesn't redirect cleanly — middleware gives a
//          single, central place to enforce all route-level rules.
// Used by: Every HTTP request to the Next.js app — runs before any page renders.

import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Use the lightweight authConfig (no Prisma/bcrypt) so this runs in the Edge runtime.
// The full auth export (with Credentials provider) is only used in server actions/API routes.
const { auth } = NextAuth(authConfig);

// Route protection rules:
// Public routes: accessible without a session
// Admin-only routes: require role = ADMIN
// Contact-user routes: role = CONTACT_USER is redirected to restricted dashboard
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
    // If already logged in, redirect away from auth pages
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

  // CONTACT_USER: restricted to /dashboard and their own invoices — redirect everything else.
  // The full restriction is enforced by the dashboard page rendering a restricted view.
  if (role === "CONTACT_USER") {
    if (!pathname.startsWith("/dashboard") && !pathname.startsWith("/my-")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // ADMIN-only routes: reject ACCOUNTANT users with a redirect to dashboard.
  if (ADMIN_ONLY_ROUTES.some((route) => pathname.startsWith(route))) {
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
});

// matcher: Apply middleware to all routes except static files, images, and Next.js internals.
// Why: Without this matcher, middleware would run on every image/font/favicon request — wasteful.
export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
