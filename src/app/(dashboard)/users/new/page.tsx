// Admin User Creation page for Urban Furniture Accounting System.
// What: Admin-only form to create new internal staff accounts (ADMIN or ACCOUNTANT).
// Why: Public signup only creates ACCOUNTANT accounts; this page lets administrators safely
//      provision elevated admin and accountant accounts directly.
// Why not: Manual database insertions are prone to hashing errors and lack input validation.
// Used by: /users/new route (accessible only by ADMIN role).

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { createUserAction } from "@/lib/actions/auth.actions";
import { Shield, AlertCircle, CheckCircle2 } from "lucide-react";

import { CredentialsModal, type CredentialsData } from "@/components/ui/CredentialsModal";

export default function NewUserPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [formData, setFormData] = useState({
    name: "",
    loginId: "",
    email: "",
    role: "ACCOUNTANT" as "ADMIN" | "ACCOUNTANT",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<CredentialsData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const role = (session?.user as any)?.role;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    const res = await createUserAction({
      ...formData,
      requestingUserRole: role || "",
    });

    setLoading(false);
    if (res.error) {
      setError(res.error);
    } else if (res.credentials) {
      setCreatedCredentials(res.credentials);
      setIsModalOpen(true);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Create System User"
        subtitle="Provision internal team credentials with designated access permissions."
      />

      <Card className="p-8">
        <div className="flex items-center gap-3 pb-6 mb-6 border-b border-[#E2D9CC]">
          <div className="w-10 h-10 rounded-sm bg-[#B91C1C]/10 text-[#B91C1C] flex items-center justify-center">
            <Shield size={20} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#171717]">Account Privileges</h3>
            <p className="text-xs text-[#3D3A36]">
              Admins have full access including user provisioning. Accountants can manage all accounting records.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}


        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Full Name"
            placeholder="e.g. Eleanor Vance"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Login ID"
              placeholder="6-12 characters"
              value={formData.loginId}
              onChange={(e) => setFormData({ ...formData, loginId: e.target.value })}
              helperText="Unique username used to log in"
              required
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="eleanor@urbanfurniture.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <Select
            label="Assigned System Role"
            value={formData.role}
            onChange={(e) =>
              setFormData({
                ...formData,
                role: e.target.value as "ADMIN" | "ACCOUNTANT",
              })
            }
            options={[
              { value: "ACCOUNTANT", label: "Accountant (Full Master & Financial Access)" },
              { value: "ADMIN", label: "Admin (Full System Access + User Management)" },
            ]}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Password"
              type="password"
              placeholder="Min 8 chars, 1 upper, 1 special"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Re-enter password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Provision User"}
            </Button>
          </div>
        </form>
      </Card>

      {/* Credentials Modal Popup */}
      <CredentialsModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          router.push("/dashboard");
        }}
        credentials={createdCredentials}
        title="Accountant / Admin Created!"
        subtitle="Credentials saved to system. You can now use these to sign in."
      />
    </div>
  );
}
