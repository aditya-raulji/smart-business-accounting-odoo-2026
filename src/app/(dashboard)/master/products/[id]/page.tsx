// Product edit page for Urban Furniture Accounting System.
// What: Server component fetching product by ID and rendering ProductEditForm.
// Why: Enforces database validity on server, serializes Decimal types, and supplies existing categories.
// Used by: /master/products/[id] route.

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { getProductCategories } from "@/lib/actions/products.actions";
import { ProductEditForm } from "./ProductEditForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductEditPage({ params }: PageProps) {
  const { id } = await params;
  const [product, existingCategories] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    getProductCategories(),
  ]);

  if (!product) {
    notFound();
  }

  const serialized = {
    ...product,
    salesPrice: Number(product.salesPrice),
    cost: Number(product.cost),
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title={`Edit: ${product.name}`}
        subtitle="Update inventory specifications, sales prices, and standard costs."
      />

      <ProductEditForm
        product={serialized}
        existingCategories={existingCategories}
      />
    </div>
  );
}
