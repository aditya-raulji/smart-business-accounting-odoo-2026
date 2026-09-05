// New Contact creation page for Urban Furniture Accounting System.
// What: Interactive form to create a new Customer or Vendor contact with immediate portal credential feedback.
// Why: When a contact is saved, a portal login (CONTACT_USER) is automatically provisioned; showing
//      these generated credentials immediately guarantees the operator can share them with the customer.
// Used by: /master/contacts/new route.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { createContact } from "@/lib/actions/contacts.actions";
import { ContactType } from "@prisma/client";
import { AlertCircle, CheckCircle2, KeyRound } from "lucide-react";

import { CredentialsModal, type CredentialsData } from "@/components/ui/CredentialsModal";

export default function NewContactPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    type: ContactType.CUSTOMER as ContactType,
    email: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    country: "India",
    pincode: "",
    imageUrl: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<CredentialsData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await createContact(formData);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else if (res.credentials) {
      setCreatedCredentials(res.credentials);
      setIsModalOpen(true);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Create Contact"
        subtitle="Add a new customer, vendor, or dual-role partner to the system."
      />

      {error && (
        <div className="p-4 rounded bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {createdCredentials ? (
        <Card className="p-8 space-y-6 bg-[#FFFDF8] border-2 border-[#171717]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#171717]">Contact & Portal Created!</h3>
              <p className="text-xs text-[#3D3A36]">
                The contact was saved, and a portal account (role: CONTACT_USER) was automatically provisioned.
              </p>
            </div>
          </div>

          <div className="p-4 rounded bg-[#F7F4EE] border border-[#E2D9CC] space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#171717]">
              <KeyRound size={15} className="text-[#B91C1C]" />
              <span>Portal Login Credentials</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 bg-white border border-[#E2D9CC] rounded-sm">
                <span className="text-[10px] uppercase font-bold text-[#A8A29E] block mb-0.5">Login ID</span>
                <span className="font-mono font-bold text-[#171717] select-all">{createdCredentials.loginId}</span>
              </div>
              {createdCredentials.password && (
                <div className="p-2.5 bg-white border border-[#E2D9CC] rounded-sm">
                  <span className="text-[10px] uppercase font-bold text-[#A8A29E] block mb-0.5">Password</span>
                  <span className="font-mono font-bold text-[#B91C1C] select-all">{createdCredentials.password}</span>
                </div>
              )}
            </div>
            <p className="text-[11px] text-[#3D3A36] pt-1">
              Yeh credentials vendor ya customer ke saath share kiye ja sakte hain portal sign-in ke liye.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button onClick={() => router.push("/master/contacts")}>
              Back to Contacts List
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Contact Name / Entity"
                placeholder="e.g. Acme Corp or Jane Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />

              <Select
                label="Contact Role"
                value={formData.type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    type: e.target.value as ContactType,
                  })
                }
                options={[
                  { value: ContactType.CUSTOMER, label: "Customer" },
                  { value: ContactType.VENDOR, label: "Vendor" },
                  { value: ContactType.BOTH, label: "Both (Customer & Vendor)" },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="contact@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                helperText="Used for portal user account and invoices"
                required
              />

              <Input
                label="Phone Number"
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>

            <div className="pt-4 border-t border-[#E2D9CC]">
              <h4 className="text-xs font-semibold uppercase tracking-[1.5px] text-[#3D3A36] mb-4">
                Address Details
              </h4>
              <div className="space-y-4">
                <Input
                  label="Street Address"
                  placeholder="123 Industrial Area, Phase 2"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                />

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Input
                    label="City"
                    placeholder="Mumbai"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                  <Input
                    label="State"
                    placeholder="Maharashtra"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  />
                  <Input
                    label="Country"
                    placeholder="India"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  />
                  <Input
                    label="Pincode"
                    placeholder="400001"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Input
                label="Profile / Avatar Image URL (Optional)"
                placeholder="https://..."
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              />
            </div>

            <div className="pt-4 border-t border-[#E2D9CC] flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving Contact..." : "Save Contact"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Credentials Modal Popup */}
      <CredentialsModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          router.push("/master/contacts");
        }}
        credentials={createdCredentials}
        title="Portal Partner Provisioned!"
        subtitle="Automatic vendor/customer portal credentials generated."
      />
    </div>
  );
}
