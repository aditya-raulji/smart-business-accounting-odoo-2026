// Product Edit Form for Urban Furniture Accounting System.
// What: Client component for editing product pricing, category, and initiating archiving.
// Why: Enables catalog management and soft-deletion (archive) without broken transaction history.
// Used by: /master/products/[id] page.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { updateProduct, archiveProduct } from "@/lib/actions/products.actions";
import { ProductType } from "@prisma/client";
import { AlertCircle, CheckCircle2, Trash2 } from "lucide-react";

interface ProductData {
  id: string;
  name: string;
  type: ProductType;
  category: string;
  salesPrice: number;
  cost: number;
  imageUrl: string | null;
}

export function ProductEditForm({
  product,
  existingCategories,
}: {
  product: ProductData;
  existingCategories: string[];
}) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: product.name,
    type: product.type,
    category: product.category,
    salesPrice: String(product.salesPrice),
    cost: String(product.cost),
    imageUrl: product.imageUrl || "",
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

    const res = await updateProduct(product.id, {
      name: formData.name,
      type: formData.type,
      category: formData.category,
      salesPrice: Number(formData.salesPrice) || 0,
      cost: Number(formData.cost) || 0,
      imageUrl: formData.imageUrl || undefined,
    });

    setLoading(false);
    if (res.error) {
      setError(res.error);
    } else {
      setSuccess("Product updated successfully!");
    }
  }

  async function handleArchive() {
    if (!confirm("Are you sure you want to archive this product?")) return;
    setArchiving(true);
    const res = await archiveProduct(product.id);
    setArchiving(false);

    if (res.error) {
      setError(res.error);
    } else {
      router.push("/master/products");
    }
  }

  const allCategories = Array.from(new Set([formData.category, ...existingCategories])).sort();

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

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Product Name / Title"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Select
            label="Item Type"
            value={formData.type}
            onChange={(e) =>
              setFormData({
                ...formData,
                type: e.target.value as ProductType,
              })
            }
            options={[
              { value: ProductType.GOODS, label: "Goods (Tangible Inventory)" },
              { value: ProductType.SERVICE, label: "Service (Assembly/Delivery)" },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            helperText="Enter or update product category grouping"
            required
          />

          <Input
            label="Image URL"
            value={formData.imageUrl}
            onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
            placeholder="https://..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#E2D9CC]">
          <Input
            label="Sales Price (₹)"
            type="number"
            step="0.01"
            min="0"
            value={formData.salesPrice}
            onChange={(e) => setFormData({ ...formData, salesPrice: e.target.value })}
            required
          />

          <Input
            label="Cost Price (₹)"
            type="number"
            step="0.01"
            min="0"
            value={formData.cost}
            onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
            required
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
            {archiving ? "Archiving..." : "Archive Product"}
          </Button>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/master/products")}
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
