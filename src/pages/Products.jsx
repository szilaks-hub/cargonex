import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import ProductForm from "@/components/products/ProductForm";
import CategoryManager from "@/components/products/CategoryManager";
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

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });

  const columns = [
    { header: "Category / Kategória", key: "category_name" },
    { header: "Factory Code / Gyári kód", key: "factory_code" },
    { header: "Diameter", render: (r) => r.diameter ? `${r.diameter} mm` : "-" },
    { header: "Length", render: (r) => r.length ? `${r.length} mm` : "-" },
    { header: "Mesh Name", key: "mesh_name", render: (r) => r.mesh_name || "-" },
    { header: "Unit / Egység", key: "unit_of_measure" },
    { header: "HS Code / VTSZ", key: "hs_code" },
    { header: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-4">
      <Tabs defaultValue="products">
        <TabsList className="bg-[#22272e] border border-[#2d333b]">
          <TabsTrigger value="products" className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400">
            Products / Cikkek
          </TabsTrigger>
          <TabsTrigger value="categories" className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400">
            Categories / Termékkörök
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4 mt-4">
          <PageHeader
            title="Products / Termékek"
            subtitle="Product master database / Terméktörzs"
            onAdd={() => { setEditItem(null); setShowForm(true); }}
            addLabel="New Product / Új termék"
          />
          {showForm && (
            <ProductForm
              item={editItem}
              categories={categories}
              onClose={() => { setShowForm(false); setEditItem(null); }}
              onSaved={() => { qc.invalidateQueries({ queryKey: ["products"] }); setShowForm(false); setEditItem(null); }}
            />
          )}
          <DataTable
            columns={columns}
            data={products}
            isLoading={isLoading}
            onRowClick={(r) => { setEditItem(r); setShowForm(true); }}
          />
        </TabsContent>

        <TabsContent value="categories" className="mt-4">
          <CategoryManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}