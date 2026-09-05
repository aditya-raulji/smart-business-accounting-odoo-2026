// Product creation form client component for Urban Furniture Accounting System.
// What: Client form for creating products with category selection or inline new category input.
// Why: Enables quick catalog entry with dynamic category suggestions.
// Used by: /master/products/new page.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { createProduct } from "@/lib/actions/products.actions";
import { ProductType } from "@prisma/client";
import { AlertCircle, PlusCircle } from "lucide-react";

export function ProductNewForm({ existingCategories }: { existingCategories: string[] }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    type: ProductType.GOODS as ProductType,
    category: existingCategories[0] || "Furniture",
    customCategory: "",
    salesPrice: "",
    cost: "",
    imageUrl: "",
  });
  const [isCustomCategory, setIsCustomCategory] = useState(existingCategories.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const categoryToSave = isCustomCategory ? formData.customCategory.trim() : formData.category;
    if (!categoryToSave) {
      setError("Please specify a category");
      setLoading(false);
      return;
    }

    const res = await createProduct({
      name: formData.name,
      type: formData.type,
      category: categoryToSave,
      salesPrice: Number(formData.salesPrice) || 0,
      cost: Number(formData.cost) || 0,
      imageUrl: formData.imageUrl || undefined,
    });

    setLoading(false);
    if (res.error) {
      setError(res.error);
    } else {
      router.push("/master/products");
    }
  }

  return (
    <Card className="p-8">
      {error && (
        <div className="mb-6 p-4 rounded bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Product Name / Title"
            placeholder="e.g. Executive Walnut Desk"
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
              { value: ProductType.GOODS, label: "Goods (Tangible Inventory / Furniture)" },
              { value: ProductType.SERVICE, label: "Service (Assembly, Delivery, Consultation)" },
            ]}
          />
        </div>

        {/* Category: select existing or create new on the fly */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-[1px] text-[#3D3A36]">
              Product Category
            </label>
            <button
              type="button"
              onClick={() => setIsCustomCategory(!isCustomCategory)}
              className="text-xs font-semibold text-[#B91C1C] hover:underline flex items-center gap-1"
            >
              <PlusCircle size={12} />
              {isCustomCategory ? "Select existing category" : "+ Add new category"}
            </button>
          </div>

          {isCustomCategory ? (
            <Input
              placeholder="e.g. Dining Chairs, Office Desks, Lighting"
              value={formData.customCategory}
              onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
              required={isCustomCategory}
            />
          ) : (
            <Select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              options={existingCategories.map((c) => ({ value: c, label: c }))}
            />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <Input
            label="Sales Price (₹)"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={formData.salesPrice}
            onChange={(e) => setFormData({ ...formData, salesPrice: e.target.value })}
            helperText="Default selling price on customer invoices"
            required
          />

          <Input
            label="Cost Price (₹)"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={formData.cost}
            onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
            helperText="Standard purchase cost from vendor"
            required
          />
        </div>

        <Input
          label="Product Image URL (Optional)"
          placeholder="https://images.unsplash.com/..."
          value={formData.imageUrl}
          onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
        />

        <div className="pt-4 border-t border-[#E2D9CC] flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Product"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
