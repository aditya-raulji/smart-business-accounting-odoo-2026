// Contacts master list page for Urban Furniture Accounting System.
// What: Fetches all active contacts from PostgreSQL via Prisma and renders with PageHeader and ContactsView.
// Why: Server-side rendering ensures fast page loads, fresh data on revalidation, and zero client-side waterfall.
// Used by: /master/contacts route.

import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { ContactsView } from "./ContactsView";

export default async function ContactsPage() {
  const contacts = await prisma.contact.findMany({
    where: { archived: false },
    orderBy: { name: "asc" },
    include: {
      user: {
        select: { loginId: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacts"
        subtitle="Manage customer and vendor entities with automated portal access provisioning."
        action={{
          label: "+ New Contact",
          href: "/master/contacts/new",
        }}
      />

      <ContactsView contacts={contacts} />
    </div>
  );
}
