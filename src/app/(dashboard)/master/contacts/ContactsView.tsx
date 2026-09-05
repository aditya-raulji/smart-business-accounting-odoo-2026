// Contacts list and kanban interactive view for Urban Furniture Accounting System.
// What: Client component managing the view mode (List vs Kanban), search filtering, and navigation.
// Why: Keeps interactive state (active tab/view, search) responsive on the client while accepting
//      server-fetched contacts for initial SEO and fast rendering.
// Why not: Putting everything in a server page would require URL query params for view toggles.
// Used by: /master/contacts page.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ViewToggle, ViewMode } from "@/components/ui/ViewToggle";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Card } from "@/components/ui/Card";
import { Mail, Phone, MapPin, Building, User } from "lucide-react";
import { ContactType } from "@prisma/client";

interface Contact {
  id: string;
  name: string;
  type: ContactType;
  email: string;
  phone: string;
  city: string | null;
  state: string | null;
  user?: { loginId: string } | null;
}

export function ContactsView({ contacts }: { contacts: Contact[] }) {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("list");

  const columns: Column<Contact>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-[#B91C1C]/10 text-[#B91C1C] flex items-center justify-center font-bold text-xs shrink-0">
            {row.name.charAt(0)}
          </div>
          <div>
            <span className="font-semibold text-[#171717]">{row.name}</span>
            {row.user && (
              <span className="ml-2 text-[10px] text-[#A8A29E] tracking-wider">
                ID: {row.user.loginId}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      render: (row) => (
        <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-[#171717]/5 text-[#171717]">
          {row.type}
        </span>
      ),
    },
    {
      key: "email",
      header: "Email",
      sortable: true,
      render: (row) => <span className="text-[#3D3A36]">{row.email}</span>,
    },
    {
      key: "phone",
      header: "Phone",
      render: (row) => <span className="text-[#3D3A36]">{row.phone}</span>,
    },
    {
      key: "city",
      header: "City / Location",
      sortable: true,
      render: (row) => (
        <span className="text-[#3D3A36]">
          {row.city ? `${row.city}${row.state ? `, ${row.state}` : ""}` : "—"}
        </span>
      ),
    },
  ];

  const types: { key: ContactType; label: string }[] = [
    { key: ContactType.CUSTOMER, label: "Customers" },
    { key: ContactType.VENDOR, label: "Vendors" },
    { key: ContactType.BOTH, label: "Both (Customer & Vendor)" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <ViewToggle view={view} onChange={setView} />
      </div>

      {view === "list" ? (
        <DataTable
          data={contacts}
          columns={columns}
          rowKey={(r) => r.id}
          searchKeys={["name", "email", "phone", "city"]}
          searchPlaceholder="Search contacts by name, email, phone..."
          onRowClick={(r) => router.push(`/master/contacts/${r.id}`)}
          emptyMessage="No active contacts found. Click '+ New Contact' to create one."
        />
      ) : (
        /* Kanban View by Contact Type */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {types.map((t) => {
            const groupContacts = contacts.filter((c) => c.type === t.key);
            return (
              <div key={t.key} className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#E2D9CC]">
                  <h3 className="text-xs font-semibold uppercase tracking-[1.5px] text-[#3D3A36]">
                    {t.label}
                  </h3>
                  <span className="text-xs font-bold text-[#171717] bg-[#E5DED2] px-2 py-0.5 rounded-sm">
                    {groupContacts.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {groupContacts.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#3D3A36] border border-dashed border-[#D4CCC0] rounded bg-[#FFFDF8]">
                      No {t.label.toLowerCase()}
                    </div>
                  ) : (
                    groupContacts.map((c) => (
                      <Card
                        key={c.id}
                        onClick={() => router.push(`/master/contacts/${c.id}`)}
                        className="p-4 cursor-pointer hover:border-[#B91C1C] transition-all hover:shadow-sm"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-sm bg-[#171717] text-[#FFFDF8] flex items-center justify-center font-bold text-xs shrink-0">
                            {c.name.charAt(0)}
                          </div>
                          <span className="font-semibold text-sm text-[#171717] truncate">{c.name}</span>
                        </div>

                        <div className="space-y-1.5 text-xs text-[#3D3A36] pt-2 border-t border-[#E2D9CC]">
                          <div className="flex items-center gap-2 truncate">
                            <Mail size={13} className="text-[#A8A29E] shrink-0" />
                            <span className="truncate">{c.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone size={13} className="text-[#A8A29E] shrink-0" />
                            <span>{c.phone}</span>
                          </div>
                          {c.city && (
                            <div className="flex items-center gap-2">
                              <MapPin size={13} className="text-[#A8A29E] shrink-0" />
                              <span>{c.city}</span>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
