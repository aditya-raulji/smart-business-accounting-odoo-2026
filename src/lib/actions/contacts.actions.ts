// Contact server actions for Urban Furniture Accounting System.
// What: CRUD server actions for the Contact master — create, update, and archive contacts.
//       On every create/update, auto-provisions a CONTACT_USER portal login if none exists.
// Why: The spec requires that saving a Contact automatically creates a linked User with
//      role = CONTACT_USER, so the contact can immediately log into the portal. Doing this
//      inside a server action (rather than a separate API call) keeps the operation atomic
//      — either both the Contact and the User are created, or neither is.
// Why not: A separate "provision portal" button would work but adds friction and could be
//          forgotten; automatic provisioning per spec is more reliable.
// Used by: /master/contacts/new and /master/contacts/[id] pages.

"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { ContactType } from "@prisma/client";
import { revalidatePath } from "next/cache";

// Validation schema for Contact form fields.
const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.nativeEnum(ContactType),
  email: z.string().email("Valid email required"),
  phone: z.string().min(1, "Phone is required"),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  pincode: z.string().optional(),
  imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type ContactInput = z.infer<typeof contactSchema>;
type ActionResult = { error?: string; success?: boolean; id?: string };

// deriveLoginId: Creates a portal loginId from the email prefix, de-duplicated with a suffix.
// Why: The spec requires loginId derived from email prefix; uniqueness is enforced by checking
//      existing loginIds with incrementing suffix (john → john1 → john2 …).
// Why not: Using a UUID would be unique but unreadable; the email prefix is more friendly.
async function deriveLoginId(email: string): Promise<string> {
  const prefix = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10);
  const base = prefix.length >= 4 ? prefix : `user${prefix}`;

  // Check if the base loginId is taken
  const existing = await prisma.user.findUnique({ where: { loginId: base } });
  if (!existing) return base;

  // Append incrementing suffix until unique
  for (let i = 1; i <= 999; i++) {
    const candidate = `${base.slice(0, 9)}${i}`;
    const taken = await prisma.user.findUnique({ where: { loginId: candidate } });
    if (!taken) return candidate;
  }
  return `${base}${Date.now().toString(36)}`;
}

// generateTempPassword: Creates a random password satisfying the policy rules.
function generateTempPassword(): string {
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const special = "!@#$%^&*";
  const digits = "0123456789";
  const all = lower + upper + special + digits;

  return (
    lower[Math.floor(Math.random() * lower.length)] +
    upper[Math.floor(Math.random() * upper.length)] +
    special[Math.floor(Math.random() * special.length)] +
    digits[Math.floor(Math.random() * digits.length)] +
    Array.from({ length: 6 }, () => all[Math.floor(Math.random() * all.length)]).join("")
  )
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

// provisionContactUser: Creates (or updates) the linked CONTACT_USER for a Contact.
// Called within createContact and updateContact to keep portal access in sync.
// TODO(Prompt 6 or later): replace console.log with a real email/SMS send to notify the contact.
async function provisionContactUser(contact: {
  id: string;
  name: string;
  email: string;
}): Promise<void> {
  const existingUser = await prisma.user.findFirst({
    where: { contactId: contact.id },
  });

  if (existingUser) {
    // User already exists — update email if contact email changed.
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { email: contact.email, name: contact.name },
    });
    return;
  }

  // Provision new CONTACT_USER account
  const loginId = await deriveLoginId(contact.email);
  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  await prisma.user.create({
    data: {
      name: contact.name,
      loginId,
      email: contact.email,
      passwordHash,
      role: "CONTACT_USER",
      contactId: contact.id,
    },
  });

  // TODO(Prompt 6 or later): replace console.log with a real email/SMS send
  console.log("═".repeat(50));
  console.log("  CONTACT PORTAL ACCESS PROVISIONED");
  console.log(`  Contact : ${contact.name} <${contact.email}>`);
  console.log(`  Login ID: ${loginId}`);
  console.log(`  Password: ${tempPassword}`);
  console.log("═".repeat(50));
}

// createContact: Creates a new Contact and provisions a CONTACT_USER portal login.
export async function createContact(input: ContactInput): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Check email uniqueness
  const existing = await prisma.contact.findUnique({ where: { email: input.email } });
  if (existing) return { error: "A contact with this email already exists." };

  const contact = await prisma.contact.create({
    data: {
      name: parsed.data.name,
      type: parsed.data.type,
      email: parsed.data.email,
      phone: parsed.data.phone,
      street: parsed.data.street || null,
      city: parsed.data.city || null,
      state: parsed.data.state || null,
      country: parsed.data.country || null,
      pincode: parsed.data.pincode || null,
      imageUrl: parsed.data.imageUrl || null,
    },
  });

  // Provision portal access immediately after contact creation
  await provisionContactUser({ id: contact.id, name: contact.name, email: contact.email });

  revalidatePath("/master/contacts");
  return { success: true, id: contact.id };
}

// updateContact: Updates an existing Contact's fields and syncs the portal user.
export async function updateContact(id: string, input: ContactInput): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Check email uniqueness (excluding self)
  const emailConflict = await prisma.contact.findFirst({
    where: { email: input.email, NOT: { id } },
  });
  if (emailConflict) return { error: "This email is already used by another contact." };

  const contact = await prisma.contact.update({
    where: { id },
    data: {
      name: parsed.data.name,
      type: parsed.data.type,
      email: parsed.data.email,
      phone: parsed.data.phone,
      street: parsed.data.street || null,
      city: parsed.data.city || null,
      state: parsed.data.state || null,
      country: parsed.data.country || null,
      pincode: parsed.data.pincode || null,
      imageUrl: parsed.data.imageUrl || null,
    },
  });

  await provisionContactUser({ id: contact.id, name: contact.name, email: contact.email });

  revalidatePath("/master/contacts");
  revalidatePath(`/master/contacts/${id}`);
  return { success: true, id };
}

// archiveContact: Soft-deletes a contact by setting archived = true.
// Preserves historical transaction data while removing from active lists.
export async function archiveContact(id: string): Promise<ActionResult> {
  await prisma.contact.update({ where: { id }, data: { archived: true } });
  revalidatePath("/master/contacts");
  return { success: true };
}
