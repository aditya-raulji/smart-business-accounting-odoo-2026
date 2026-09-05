// Zod validation schemas for authentication forms.
// What: Defines loginSchema and signupSchema with all business rules from spec §5.
// Why: Sharing schemas between client-side form validation (react-hook-form resolver) and
//      server-side action validation ensures both layers enforce the same rules without
//      duplicating regex patterns or error messages.
// Why not: Separate client and server schemas would drift over time; a single source of truth
//          prevents bugs where the client allows something the server rejects.
// Used by: /login page (loginSchema), /signup page (signupSchema), auth.ts (loginSchema).

import { z } from "zod";

// Password policy per spec §5: lowercase + uppercase + special char + > 8 chars.
// Using a regex that asserts each character class independently so error messages
// can be targeted (though we show the full rule inline per spec).
const passwordSchema = z
  .string()
  .min(9, "Password must be more than 8 characters")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "Password must contain at least one special character");

// loginIdSchema: 6-12 alphanumeric characters as per spec §5.
const loginIdSchema = z
  .string()
  .min(6, "Login ID must be 6–12 characters")
  .max(12, "Login ID must be 6–12 characters")
  .regex(/^[a-zA-Z0-9]+$/, "Login ID may only contain letters and numbers");

// loginSchema: credentials for the sign-in form.
export const loginSchema = z.object({
  loginId: z.string().min(1, "Login ID is required"),
  password: z.string().min(1, "Password is required"),
});

// signupSchema: full validation for the public signup page (creates ACCOUNTANT).
// confirmPassword: client-side only — not sent to the server action.
export const signupSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    loginId: loginIdSchema,
    email: z.string().email("Please enter a valid email address"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// createUserSchema: Admin-only form for /users/new — creates ADMIN or ACCOUNTANT.
export const createUserSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    loginId: loginIdSchema,
    email: z.string().email("Please enter a valid email address"),
    role: z.enum(["ADMIN", "ACCOUNTANT"]),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
export type CreateUserFormData = z.infer<typeof createUserSchema>;
