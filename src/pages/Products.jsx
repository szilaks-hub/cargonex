import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ProductForm from "@/components/products/ProductForm";
import CategoryManager from "@/components/products/CategoryManager";
import ProductCatalog from "@/components/products/ProductCatalog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function Products() {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const qc = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => base44.entities.ProductCategory.list(),
  });

  const handleAdd = () => { setEditItem(null); setShowForm(true); };
  const handleEdit = (r) => { setEditItem(r); setShowForm(true); };
  const handleSaved = () => { qc.invalidateQueries({ queryKey: ["products"] }); setShowForm(false); setEditItem(null); };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="products">
        <TabsList className="bg-[#e4e7ec] border border-[#D9E1E8] p-1 rounded-lg">
          <TabsTrigger
            value="products"
            className="text-slate-600 font-medium text-xs rounded-md data-[state=active]:bg-[#2563eb] data-[state=active]:text-white data-[state=active]:shadow-sm"
          >
            Products / Cikkek
          </TabsTrigger>
          <TabsTrigger
            value="categories"
            className="text-slate-600 font-medium text-xs rounded-md data-[state=active]:bg-[#2563eb] data-[state=active]:text-white data-[state=active]:shadow-sm"
          >
            Categories / Termékkörök
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-4">
          {showForm && (
            <div className="mb-4">
              <ProductForm
                item={editItem}
                categories={categories}
                onClose={() => { setShowForm(false); setEditItem(null); }}
                onSaved={handleSaved}
              />
            </div>
          )}
          <ProductCatalog
            products={products}
            categories={categories}
            isLoading={isLoading}
            onEdit={handleEdit}
            onAdd={handleAdd}
          />
        </TabsContent>

        <TabsContent value="categories" className="mt-4">
          <CategoryManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}