// Product master list page for Urban Furniture Accounting System.
// What: Server component loading active products from PostgreSQL with connection failure resilience and rendering ProductsView.
// Why: Fast server rendering, graceful connection fallback for Neon serverless database wakeups.
// Used by: /master/products route.

import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProductsView } from "./ProductsView";
import { Product } from "@prisma/client";

export default async function ProductsPage() {
  let products: Product[] = [];

  try {
    products = await prisma.product.findMany({
      where: { archived: false },
      orderBy: { name: "asc" },
    });
  } catch (err: unknown) {
    console.error("Prisma product fetch error:", err);
    // If connection dropped during Neon sleep, attempt single retry
    try {
      products = await prisma.product.findMany({
        where: { archived: false },
        orderBy: { name: "asc" },
      });
    } catch (retryErr) {
      console.error("Retry failed:", retryErr);
      products = [];
    }
  }

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
