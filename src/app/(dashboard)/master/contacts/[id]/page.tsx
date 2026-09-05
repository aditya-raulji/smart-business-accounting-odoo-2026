// Contact edit page for Urban Furniture Accounting System.
// What: Server component loading contact record by id and rendering ContactEditForm.
// Why: Validates entity existence on the server, redirects 404 cleanly, and includes linked portal details.
// Used by: /master/contacts/[id] route.

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { ContactEditForm } from "./ContactEditForm";

export default async function ContactEditPage({
  params,
}: {
  params: { id: string };
}) {
  const contact = await prisma.contact.findUnique({
    where: { id: params.id },
    include: {
      user: {
        select: { loginId: true, email: true },
      },
    },
  });

  if (!contact) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title={`Edit: ${contact.name}`}
        subtitle={`Update contact parameters and view portal assignment status.`}
      />

      <ContactEditForm contact={contact} />
    </div>
  );
}
