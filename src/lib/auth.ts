// Auth.js v5 (NextAuth beta) configuration for Urban Furniture Accounting System.
// What: Sets up the Credentials provider, JWT session strategy, and injects role/id/contactId
//       into the session token so middleware can enforce RBAC without a DB lookup on every request.
// Why: Using JWT strategy avoids a Session table in the database and makes every middleware check
//      a pure in-memory token decode — fast and stateless. The role is embedded in the token so
//      we never need a DB round-trip to check permissions in middleware.ts.
// Why not: Database session strategy would require a Session model and a DB query on every
//           protected page load — adds latency and schema complexity for no benefit here.
// Used by: middleware.ts (session reading), server actions (auth() call), login/signup pages.

import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { loginSchema } from "@/lib/validations/auth";

// authConfig: Separates route-matching config from database-dependent callbacks.
// This allows middleware.ts to import only authConfig (no Prisma import in Edge runtime).
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // jwt callback: runs when a JWT is created or refreshed. We embed role, id, and contactId
    // so that every downstream session check has the data it needs without a DB lookup.
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
        token.contactId = (user as any).contactId ?? null;
      }
      return token;
    },
    // session callback: maps the JWT payload onto the session object that client components see.
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
        (session.user as any).contactId = token.contactId;
      }
      return session;
    },
    // authorized callback: used by middleware to decide if a request is allowed.
    // Returns true only when a valid token exists; route-level role checks happen in middleware.ts.
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
  providers: [],
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET,
};

// Full auth export: includes the Credentials provider which needs bcrypt (Node.js only — not Edge).
// Credentials provider: validates loginId + password against the database.
// Why Credentials: The spec mandates a custom loginId field (not email-based OAuth); there's no
//   social auth requirement. Credentials provider is the correct fit.
// Why not OAuth: No OAuth provider is specified; implementing Google/GitHub OAuth would require
//   domain setup and add scope creep in a 24h build.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        // Validate the shape of incoming credentials with zod first.
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { loginId, password } = parsed.data;

        // Look up user by loginId — this is the authoritative identifier (not email).
        const user = await prisma.user.findUnique({ where: { loginId } });
        if (!user) return null;

        // Compare the submitted password against the stored bcrypt hash.
        // bcrypt.compare is timing-safe; do not compare with ===.
        const passwordMatch = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatch) return null;

        // Return a minimal user object; the jwt callback embeds role/contactId into the token.
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          contactId: user.contactId,
        };
      },
    }),
  ],
});
