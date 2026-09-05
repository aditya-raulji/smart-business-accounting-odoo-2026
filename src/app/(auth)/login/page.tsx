// Login page for Urban Furniture Accounting System.
// What: Presents a branded sign-in form with loginId + password fields. On submit, calls the
//       Auth.js signIn() server action. Shows the exact error message from spec §5 on failure.
// Why: The form uses react-hook-form + zod so field-level errors appear inline without full
//      page reloads. Wrapped in Suspense to satisfy Next.js useSearchParams requirements.
// Used by: All unauthenticated users accessing the system.

"use client";

import { useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { loginSchema, type LoginFormData } from "@/lib/validations/auth";
import { Eye, EyeOff } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginFormData) {
    setError(null);
    try {
      const result = await signIn("credentials", {
        loginId: data.loginId,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        // Spec §5: exact error message — never reveal which field was wrong.
        setError("Invalid Login Id or Password");
        return;
      }

      // Redirect to callbackUrl (if set by middleware) or dashboard.
      const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Invalid Login Id or Password");
    }
  }

  return (
    <div className="w-full max-w-md animate-fade-up">
      {/* Brand heading */}
      <div className="mb-10 text-center">
        <h1
          className="text-5xl font-bold mb-2"
          style={{
            fontFamily: "var(--font-playfair)",
            fontStyle: "italic",
            letterSpacing: "-0.02em",
            color: "#171717",
          }}
        >
          Urban Furniture
        </h1>
        <p className="text-[11px] font-medium uppercase tracking-[2px] text-[#3D3A36]">
          Accounting System
        </p>
      </div>

      {/* Login card */}
      <div className="bg-[#FFFDF8] border border-[#D4CCC0] rounded-[4px] p-8 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
        <h2
          className="text-2xl font-semibold mb-1"
          style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic" }}
        >
          Sign in
        </h2>
        <p className="text-sm text-[#3D3A36] mb-6">
          Enter your login credentials to continue.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Input
            label="Login ID"
            placeholder="Enter your login ID"
            autoComplete="username"
            error={errors.loginId?.message}
            {...register("loginId")}
          />

          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-8 text-[#3D3A36] hover:text-[#171717]"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Form-level error — per spec, never reveal which field was wrong */}
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-[#B91C1C] rounded-sm">
              <p className="text-sm text-[#B91C1C] font-medium">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            className="w-full mt-2 uppercase tracking-widest"
          >
            Sign In →
          </Button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-[#3D3A36]">
        New accountant?{" "}
        <Link href="/signup" className="text-[#B91C1C] font-medium hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-xs text-[#3D3A36] text-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
