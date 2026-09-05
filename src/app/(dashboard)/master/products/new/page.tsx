// New Product page for Urban Furniture Accounting System.
// What: Server component fetching existing categories and rendering ProductNewForm.
// Why: Provides existing category suggestions to prevent duplicate category spellings.
// Used by: /master/products/new route.

import { PageHeader } from "@/components/ui/PageHeader";
import { getProductCategories } from "@/lib/actions/products.actions";
import { ProductNewForm } from "./ProductNewForm";

export default async function NewProductPage() {
  const existingCategories = await getProductCategories();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Create Product"
        subtitle="Add a furniture piece or specialized service to the central inventory catalog."
      />

      <ProductNewForm existingCategories={existingCategories} />
    </div>
  );
}
