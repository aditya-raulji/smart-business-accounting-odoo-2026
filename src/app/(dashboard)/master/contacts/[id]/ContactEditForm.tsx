// Contact Edit Form for Urban Furniture Accounting System.
// What: Client component for editing contact details and triggering archive actions.
// Why: Provides interactive form submission and deletion/archiving state transitions.
// Used by: /master/contacts/[id] page.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { updateContact, archiveContact } from "@/lib/actions/contacts.actions";
import { ContactType } from "@prisma/client";
import { AlertCircle, CheckCircle2, Trash2, KeyRound } from "lucide-react";

interface ContactData {
  id: string;
  name: string;
  type: ContactType;
  email: string;
  phone: string;
  street: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  imageUrl: string | null;
  user?: { loginId: string; email: string } | null;
}

export function ContactEditForm({ contact }: { contact: ContactData }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: contact.name,
    type: contact.type,
    email: contact.email,
    phone: contact.phone,
    street: contact.street || "",
    city: contact.city || "",
    state: contact.state || "",
    country: contact.country || "India",
    pincode: contact.pincode || "",
    imageUrl: contact.imageUrl || "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [archiving, setArchiving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const res = await updateContact(contact.id, formData);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setSuccess("Contact updated successfully!");
    }
  }

  async function handleArchive() {
    if (!confirm("Are you sure you want to archive this contact?")) return;
    setArchiving(true);
    const res = await archiveContact(contact.id);
    setArchiving(false);

    if (res.error) {
      setError(res.error);
    } else {
      router.push("/master/contacts");
    }
  }

  return (
    <Card className="p-8">
      {error && (
        <div className="mb-6 p-4 rounded bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {contact.user && (
        <div className="mb-6 p-4 rounded bg-[#F7F4EE] border border-[#E2D9CC] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <KeyRound size={15} className="text-[#B91C1C]" />
            <span className="text-[#3D3A36]">Linked Portal User:</span>
            <strong className="text-[#171717]">{contact.user.loginId}</strong>
          </div>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-[#171717] bg-white px-2 py-0.5 rounded border border-[#D4CCC0]">
            Portal Active
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Contact Name / Entity"
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
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />

          <Input
            label="Phone Number"
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
              value={formData.street}
              onChange={(e) => setFormData({ ...formData, street: e.target.value })}
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Input
                label="City"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
              <Input
                label="State"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
              <Input
                label="Country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              />
              <Input
                label="Pincode"
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="pt-2">
          <Input
            label="Profile / Avatar Image URL"
            value={formData.imageUrl}
            onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
          />
        </div>

        <div className="pt-4 border-t border-[#E2D9CC] flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleArchive}
            disabled={loading || archiving}
            className="text-red-700 hover:bg-red-50 hover:border-red-300"
          >
            <Trash2 size={14} className="mr-1.5" />
            {archiving ? "Archiving..." : "Archive Contact"}
          </Button>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/master/contacts")}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
