// Auth.js route handlers for Urban Furniture Accounting System.
// What: Exports GET and POST handlers that Auth.js uses for its built-in endpoints
//       (/api/auth/signin, /api/auth/signout, /api/auth/session, /api/auth/csrf, etc.).
// Why: Auth.js v5's app-router integration requires these handlers to be exported from
//      this exact file path so the [...nextauth] catch-all route forwards all auth-related
//      HTTP requests to the Auth.js engine. Next.js 16 expects explicit async NextRequest handlers.
// Why not: Building custom API routes for each auth action (signin/signout/session) would
//          require reimplementing CSRF protection, cookie signing, and callback flows.
// Used by: Auth.js internally (called from its client SDK) and by server-side auth() calls.

import { handlers } from "@/lib/auth";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return handlers.GET(req);
}

export async function POST(req: NextRequest) {
  return handlers.POST(req);
}
