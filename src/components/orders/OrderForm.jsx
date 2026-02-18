import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

const INCOTERMS = ['EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP', 'FAS', 'FOB', 'CFR', 'CIF'];

export default function OrderForm({ orderId, onSaved, isDraft }) {
  const [formData, setFormData] = useState({
    supplier_id: "",
    supplier_site_id: "",
    order_date: new Date().toISOString().split('T')[0],
    currency: "EUR",
    incoterms_type: "FCA",
    incoterms_place: "",
    payment_terms: "",
    notes: ""
  });
  const [saving, setSaving] = useState(false);

  const { data: order } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => base44.entities.PurchaseOrder.filter({ id: orderId }).then(r => r?.[0]),
    enabled: !!orderId
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Partner.filter({ roles: 'supplier' }),
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['sites', formData.supplier_id],
    queryFn: () => formData.supplier_id ? base44.entities.PartnerLocation.filter({ partner_id: formData.supplier_id }) : [],
    enabled: !!formData.supplier_id
  });

  useEffect(() => {
    if (order) {
      setFormData({
        supplier_id: order.supplier_id,
        supplier_site_id: order.supplier_site_id,
        order_date: order.order_date,
        currency: order.currency,
        incoterms_type: order.incoterms_type,
        incoterms_place: order.incoterms_place || "",
        payment_terms: order.payment_terms || "",
        notes: order.notes || ""
      });
    }
  }, [order]);

  const handleSave = async () => {
    if (!formData.supplier_id || !formData.supplier_site_id || !formData.order_date) {
      alert('Supplier, site, and date required');
      return;
    }

    setSaving(true);
    try {
      const supplier = suppliers.find(s => s.id === formData.supplier_id);
      const site = sites.find(s => s.id === formData.supplier_site_id);

      const data = {
        supplier_id: formData.supplier_id,
        supplier_name: supplier?.name,
        supplier_site_id: formData.supplier_site_id,
        supplier_site_name: site?.location_name,
        order_date: formData.order_date,
        currency: formData.currency,
        incoterms_type: formData.incoterms_type,
        incoterms_place: formData.incoterms_place,
        payment_terms: formData.payment_terms,
        notes: formData.notes
      };

      if (orderId) {
        await base44.entities.PurchaseOrder.update(orderId, data);
      } else {
        await base44.entities.PurchaseOrder.create(data);
      }
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5 space-y-4">
      <h3 className="text-lg font-semibold text-slate-800">Order Details</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select value={formData.supplier_id} onValueChange={(v) => setFormData({...formData, supplier_id: v, supplier_site_id: ""})} disabled={!isDraft}>
          <SelectTrigger disabled={!isDraft}>
            <SelectValue placeholder="Supplier *" />
          </SelectTrigger>
          <SelectContent>
            {suppliers.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={formData.supplier_site_id} onValueChange={(v) => setFormData({...formData, supplier_site_id: v})} disabled={!isDraft || !formData.supplier_id}>
          <SelectTrigger disabled={!isDraft || !formData.supplier_id}>
            <SelectValue placeholder="Supplier Site *" />
          </SelectTrigger>
          <SelectContent>
            {sites.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.location_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={formData.order_date}
          onChange={(e) => setFormData({...formData, order_date: e.target.value})}
          disabled={!isDraft}
        />

        <Select value={formData.currency} onValueChange={(v) => setFormData({...formData, currency: v})} disabled={!isDraft}>
          <SelectTrigger disabled={!isDraft}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EUR">EUR</SelectItem>
            <SelectItem value="HUF">HUF</SelectItem>
            <SelectItem value="USD">USD</SelectItem>
          </SelectContent>
        </Select>

        <Select value={formData.incoterms_type} onValueChange={(v) => setFormData({...formData, incoterms_type: v})} disabled={!isDraft}>
          <SelectTrigger disabled={!isDraft}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INCOTERMS.map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="text"
          placeholder="Incoterms Place"
          value={formData.incoterms_place}
          onChange={(e) => setFormData({...formData, incoterms_place: e.target.value})}
          disabled={!isDraft}
        />

        <Input
          type="text"
          placeholder="Payment Terms (e.g., 30 days Net)"
          value={formData.payment_terms}
          onChange={(e) => setFormData({...formData, payment_terms: e.target.value})}
          disabled={!isDraft}
          className="md:col-span-2"
        />

        <Input
          type="text"
          placeholder="Notes"
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          disabled={!isDraft}
          className="md:col-span-2"
        />
      </div>

      {isDraft && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      )}
    </Card>
  );
}