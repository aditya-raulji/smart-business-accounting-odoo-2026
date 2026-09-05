// Product master list page for Urban Furniture Accounting System.
// What: Server component loading active products from PostgreSQL and rendering ProductsView.
// Why: Fast server rendering, no layout shifts, full SEO and data freshness.
// Used by: /master/products route.

import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProductsView } from "./ProductsView";

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    where: { archived: false },
    orderBy: { name: "asc" },
  });

  // Convert Decimal fields to regular numbers for client serialization
  const serialized = products.map((p) => ({
    ...p,
    salesPrice: Number(p.salesPrice),
    cost: Number(p.cost),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products & Services"
        subtitle="Manage furniture goods catalog, operational service offerings, pricing, and cost margins."
        action={{
          label: "+ New Product",
          href: "/master/products/new",
        }}
      />

      <ProductsView products={serialized} />
    </div>
  );
}
