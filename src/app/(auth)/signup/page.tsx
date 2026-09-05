// Signup page for Urban Furniture Accounting System.
// What: Public registration form that always creates an ACCOUNTANT account (never ADMIN or
//       CONTACT_USER). Calls a server action on submit.
// Why: Spec §5 mandates that the public signup can only create ACCOUNTANT accounts. The role is
//      NOT a form field — it's hardcoded on the server side in the signup action so a malicious
//      actor can't POST role=ADMIN and elevate themselves.
// Why not: If role were a form field (even a hidden one), it would be trivially spoofable.
//          Server-side hardcoding is the only safe approach.
// Used by: Any new accountant joining the firm; they get their own login without Admin intervention.

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { signupSchema, type SignupFormData } from "@/lib/validations/auth";
import { signupAction } from "@/lib/actions/auth.actions";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const password = watch("password", "");

  // Password strength indicators — shown inline per spec §5 rule display requirement.
  const rules = [
    { label: "More than 8 characters", met: password.length > 8 },
    { label: "One lowercase letter", met: /[a-z]/.test(password) },
    { label: "One uppercase letter", met: /[A-Z]/.test(password) },
    { label: "One special character", met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
  ];

  async function onSubmit(data: SignupFormData) {
    setServerError(null);
    const result = await signupAction({
      name: data.name,
      loginId: data.loginId,
      email: data.email,
      password: data.password,
    });

    if (result.error) {
      setServerError(result.error);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/login"), 2000);
  }

  if (success) {
    return (
      <div className="w-full max-w-md text-center animate-fade-up">
        <CheckCircle2 size={48} className="mx-auto mb-4 text-green-600" />
        <h2
          className="text-2xl font-semibold mb-2"
          style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic" }}
        >
          Account created!
        </h2>
        <p className="text-sm text-[#3D3A36]">Redirecting you to login…</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md animate-fade-up">
      <div className="mb-8 text-center">
        <h1
          className="text-4xl font-bold mb-2"
          style={{
            fontFamily: "var(--font-playfair)",
            fontStyle: "italic",
            letterSpacing: "-0.02em",
            color: "#171717",
          }}
        >
          Create Account
        </h1>
        <p className="text-[11px] font-medium uppercase tracking-[2px] text-[#3D3A36]">
          Accountant Registration
        </p>
      </div>

      <div className="bg-[#FFFDF8] border border-[#D4CCC0] rounded-[4px] p-8 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Input
            label="Full Name"
            placeholder="Your full name"
            error={errors.name?.message}
            {...register("name")}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Login ID"
              placeholder="6–12 characters"
              autoComplete="username"
              error={errors.loginId?.message}
              {...register("loginId")}
            />
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              error={errors.email?.message}
              {...register("email")}
            />
          </div>

          {/* Password with strength indicators */}
          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a strong password"
              autoComplete="new-password"
              error={errors.password?.message}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-8 text-[#3D3A36]"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Inline password rules — shown while user types, per spec §5 */}
          {password.length > 0 && (
            <div className="flex flex-col gap-1 px-3 py-2 bg-[#F7F3EA] rounded-sm border border-[#E5DED2]">
              {rules.map((rule) => (
                <div key={rule.label} className="flex items-center gap-2">
                  <div
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${rule.met ? "bg-green-600" : "bg-[#D4CCC0]"}`}
                  />
                  <span
                    className={`text-[11px] ${rule.met ? "text-green-700" : "text-[#3D3A36]"}`}
                  >
                    {rule.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="relative">
            <Input
              label="Re-enter Password"
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm your password"
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-8 text-[#3D3A36]"
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {serverError && (
            <div className="px-4 py-3 bg-red-50 border border-[#B91C1C] rounded-sm">
              <p className="text-sm text-[#B91C1C] font-medium">{serverError}</p>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            className="w-full mt-2 uppercase tracking-widest"
          >
            Create Account →
          </Button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-[#3D3A36]">
        Already have an account?{" "}
        <Link href="/login" className="text-[#B91C1C] font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
