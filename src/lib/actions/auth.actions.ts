// Auth server actions for Urban Furniture Accounting System.
// What: Server-side actions for user signup and admin-created user accounts.
// Why: Using Server Actions means the form data is validated and written to the database
//      entirely on the server — no API route needed, no client-side fetch, no CORS config.
//      The signupAction hardcodes role = ACCOUNTANT on the server so it cannot be spoofed.
// Why not: An API route would work but requires separate type definitions for request/response,
//          a fetch() call in the component, and manual error serialization — all extra plumbing.
// Used by: /signup page (signupAction), /users/new page (createUserAction).

"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signupSchema, createUserSchema } from "@/lib/validations/auth";

type ActionResult = { error?: string; success?: boolean };

// signupAction: Creates an ACCOUNTANT account from the public signup form.
// Role is NOT taken from the form — hardcoded to ACCOUNTANT here for security.
// Why bcrypt cost factor 12: balances security (high cost = slow brute-force) vs UX
//   (a 24h hackathon doesn't need cost 14's ~1s delay — 12 is the right tradeoff).
export async function signupAction(input: {
  name: string;
  loginId: string;
  email: string;
  password: string;
}): Promise<ActionResult> {
  // Re-validate on server — never trust client-side validation alone.
  const parsed = signupSchema.safeParse({
    ...input,
    confirmPassword: input.password, // confirmPassword is client-only; skip server check
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Check uniqueness of loginId and email before hashing (fast fail).
  const [existingLogin, existingEmail] = await Promise.all([
    prisma.user.findUnique({ where: { loginId: input.loginId } }),
    prisma.user.findUnique({ where: { email: input.email } }),
  ]);

  if (existingLogin) return { error: "Login ID is already taken. Please choose another." };
  if (existingEmail) return { error: "An account with this email already exists." };

  const passwordHash = await bcrypt.hash(input.password, 12);

  await prisma.user.create({
    data: {
      name: input.name,
      loginId: input.loginId,
      email: input.email,
      passwordHash,
      role: "ACCOUNTANT", // Always ACCOUNTANT — never let the client dictate this
    },
  });

  return { success: true };
}

// createUserAction: Admin-only action for /users/new — can create ADMIN or ACCOUNTANT.
// Caller is responsible for verifying the requesting user is ADMIN before calling this.
// (Middleware handles route protection; this action is an additional safeguard.)
export async function createUserAction(input: {
  name: string;
  loginId: string;
  email: string;
  role: "ADMIN" | "ACCOUNTANT";
  password: string;
  confirmPassword: string;
  requestingUserRole: string;
}): Promise<ActionResult> {
  // Double-check caller role on the server — defence in depth.
  if (input.requestingUserRole !== "ADMIN") {
    return { error: "Unauthorized: only admins can create user accounts." };
  }

  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const [existingLogin, existingEmail] = await Promise.all([
    prisma.user.findUnique({ where: { loginId: input.loginId } }),
    prisma.user.findUnique({ where: { email: input.email } }),
  ]);

  if (existingLogin) return { error: "Login ID is already taken." };
  if (existingEmail) return { error: "An account with this email already exists." };

  const passwordHash = await bcrypt.hash(input.password, 12);

  await prisma.user.create({
    data: {
      name: input.name,
      loginId: input.loginId,
      email: input.email,
      passwordHash,
      role: input.role,
    },
  });

  return { success: true };
}
