// Product server actions for Urban Furniture Accounting System.
// What: CRUD server actions for the Product master — create, update, and archive products.
// Why: Server actions mutate the DB atomically and revalidate the Next.js page cache so the
//      list view shows updated data immediately without a manual refresh.
// Why not: Client-side fetch to an API route would require manual cache invalidation (router.refresh)
//          and duplicate error handling — Server Actions handle this more cleanly.
// Used by: /master/products/new and /master/products/[id] pages.

"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { ProductType } from "@prisma/client";
import { revalidatePath } from "next/cache";

// Validation schema for Product form fields.
const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  type: z.nativeEnum(ProductType),
  category: z.string().min(1, "Category is required"),
  salesPrice: z.coerce.number().min(0, "Sales price must be ≥ 0"),
  cost: z.coerce.number().min(0, "Cost must be ≥ 0"),
  imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type ProductInput = z.infer<typeof productSchema>;
type ActionResult = { error?: string; success?: boolean; id?: string };

// getProductCategories: Returns the distinct category values from all existing products.
// This powers the "create on the fly" category dropdown per spec §6.2 — no separate Category table.
// Why: Using Prisma's groupBy/distinct is cheaper than a separate Category table + FK join.
// Why not: A Category table would provide referential integrity but adds CRUD overhead that isn't
//          required by the spec — we log the decision in DECISIONS.md.
export async function getProductCategories(): Promise<string[]> {
  const results = await prisma.product.findMany({
    distinct: ["category"],
    select: { category: true },
    where: { archived: false },
    orderBy: { category: "asc" },
  });
  return results.map((r) => r.category);
}

// createProduct: Creates a new product record in the database.
export async function createProduct(input: ProductInput): Promise<ActionResult> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const product = await prisma.product.create({
    data: {
      name: parsed.data.name,
      type: parsed.data.type,
      category: parsed.data.category,
      salesPrice: parsed.data.salesPrice,
      cost: parsed.data.cost,
      imageUrl: parsed.data.imageUrl || null,
    },
  });

  revalidatePath("/master/products");
  return { success: true, id: product.id };
}

// updateProduct: Updates an existing product's fields.
export async function updateProduct(id: string, input: ProductInput): Promise<ActionResult> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.product.update({
    where: { id },
    data: {
      name: parsed.data.name,
      type: parsed.data.type,
      category: parsed.data.category,
      salesPrice: parsed.data.salesPrice,
      cost: parsed.data.cost,
      imageUrl: parsed.data.imageUrl || null,
    },
  });

  revalidatePath("/master/products");
  revalidatePath(`/master/products/${id}`);
  return { success: true, id };
}

// archiveProduct: Soft-deletes a product by setting archived = true.
export async function archiveProduct(id: string): Promise<ActionResult> {
  await prisma.product.update({ where: { id }, data: { archived: true } });
  revalidatePath("/master/products");
  return { success: true };
}
