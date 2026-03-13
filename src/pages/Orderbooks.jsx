import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Eye, ChevronDown, GripVertical, Filter, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import OrderbookDetail from "@/components/orderbooks/OrderbookDetail";
import OrderbooksMasterSummary from "@/components/orderbooks/OrderbooksMasterSummary";
import OrderbookFamilyTree from "@/components/orderbooks/OrderbookFamilyTree";
import PageHeader from "@/components/ui/PageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function OrderbooksPage() {
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [activeTab, setActiveTab] = useState("open");
  const [selectedSupplier, setSelectedSupplier] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [syncing, setSyncing] = useState(false);
  const qc = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orderbooks'],
    queryFn: () => base44.entities.Orderbook.list(),
  });

  const { data: lines = [] } = useQuery({
    queryKey: ['orderbook-lines'],
    queryFn: () => base44.entities.OrderbookLine.list(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.ProductCategory.list(),
  });

  const { data: trucks = [] } = useQuery({
    queryKey: ['trucks'],
    queryFn: () => base44.entities.Truck.list(),
    refetchInterval: 2000, // Auto-refresh trucks for real-time allocation updates
  });

  const allSuppliers = [...new Set(orders.filter(o => o.supplier_id).map(o => ({ id: o.supplier_id, name: o.supplier_name })))];
  const uniqueSuppliers = Array.from(
    new Map(allSuppliers.map(s => [s.id, s])).values()
  ).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const filterOrders = (ordersList) => {
    let filtered = ordersList;
    
    if (selectedSupplier !== "all") {
      filtered = filtered.filter(o => o.supplier_id === selectedSupplier);
    }
    
    if (selectedCategory !== "all") {
      const ordersWithCategory = new Set(
        lines.filter(l => l.category_id === selectedCategory).map(l => l.orderbook_id)
      );
      filtered = filtered.filter(o => ordersWithCategory.has(o.id));
    }
    
    return filtered;
  };

  const openOrders = filterOrders(orders.filter(o => o.status === 'open')).sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
  const closedOrders = filterOrders(orders.filter(o => o.status === 'closed')).sort((a, b) => new Date(b.closed_at) - new Date(a.closed_at));

  const allCategories = [...new Set(lines.filter(l => l.category_id).map(l => ({ id: l.category_id, name: l.category_name })))];
  const uniqueCategories = Array.from(
    new Map(allCategories.map(c => [c.id, c])).values()
  ).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const getOrderMetrics = (orderId) => {
    const orderLines = lines.filter(l => l.orderbook_id === orderId);
    return {
      plannedTons: orderLines.reduce((s, l) => s + (l.planned_quantity_tons || 0), 0),
      allocatedTons: orderLines.reduce((s, l) => s + (l.allocated_quantity_tons || 0), 0),
      valueEUR: orderLines.reduce((s, l) => s + (l.line_value_eur || 0), 0),
      customsRequired: 0
    };
  };

  const handleCreateOrder = async () => {
    try {
      const result = await base44.entities.Orderbook.create({
        order_no: `ORD-${Date.now()}`,
        supplier_id: "",
        supplier_site_id: "",
        order_date: new Date().toISOString().split('T')[0],
        currency: "EUR",
        incoterms_type: "FCA",
        customs_required: false,
        status: "draft"
      });
      setSelectedOrderId(result.id);
      qc.invalidateQueries({ queryKey: ['orderbooks'] });
      toast.success('Draft order created');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleMasterSync = async () => {
    setSyncing(true);
    
    try {
      // Get all orderbooks with trucks
      const orderbooksWithTrucks = [...new Set(trucks.map(t => t.orderbook_id).filter(Boolean))];
      
      if (orderbooksWithTrucks.length === 0) {
        toast.warning('⚠️ Nincs kamion, ami szinkronizálásra vár');
        setSyncing(false);
        return;
      }
      
      const totalTrucks = trucks.filter(t => t.orderbook_id && t.status !== 'cancelled').length;
      toast.info(`🔄 Szinkronizálás: ${orderbooksWithTrucks.length} rendelés, ${totalTrucks} kamion...`);
      
      let successCount = 0;
      let errorCount = 0;
      const errors = [];
      
      // Sync each orderbook
      for (const orderbookId of orderbooksWithTrucks) {
        try {
          const result = await base44.functions.invoke('syncOrderbookAllocations', {
            event: { type: 'manual_sync' },
            data: { orderbook_id: orderbookId }
          });
          console.log(`Sync result for ${orderbookId}:`, result);
          successCount++;
        } catch (err) {
          console.error(`Sync failed for ${orderbookId}:`, err);
          errors.push({ orderbookId, error: err.message });
          errorCount++;
        }
      }
      
      // Refresh all data
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['orderbooks'] }),
        qc.invalidateQueries({ queryKey: ['orderbook-lines'] }),
        qc.invalidateQueries({ queryKey: ['trucks'] }),
        qc.invalidateQueries({ queryKey: ['all-trucks-for-capacity'] })
      ]);
      
      if (successCount > 0 && errorCount === 0) {
        toast.success(`✅ Sikeres szinkronizáció! ${successCount} rendelés frissítve`, { duration: 4000 });
      } else if (successCount > 0 && errorCount > 0) {
        toast.warning(`⚠️ Részleges siker: ${successCount} OK, ${errorCount} hiba`);
      } else if (errorCount > 0) {
        toast.error(`❌ ${errorCount} rendelés szinkronizálása sikertelen`);
        console.error('Sync errors:', errors);
      }
    } catch (error) {
      toast.error(`Szinkronizációs hiba: ${error.message}`);
      console.error('Master sync error:', error);
    } finally {
      setSyncing(false);
    }
  };

  const openMetrics = {
    count: openOrders.length,
    tons: openOrders.reduce((s, o) => s + getOrderMetrics(o.id).plannedTons, 0),
    value: openOrders.reduce((s, o) => s + getOrderMetrics(o.id).valueEUR, 0),
    customsCount: openOrders.filter(o => o.customs_required).length,
    suppliers: new Set(openOrders.map(o => o.supplier_id)).size
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orderbooks / Rendelések"
        subtitle="Fast order capture for logistics planning"
        onAdd={handleCreateOrder}
        addLabel="New Order"
      />

      {/* Master Sync Button */}
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <RefreshCw className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-800">Master Szinkronizáció</h3>
            </div>
            <p className="text-sm text-slate-600">
              Újraszámolja az összes rendelés allokációját a kamionok alapján. 
              Használd, ha az adatok nincsenek szinkronban.
            </p>
          </div>
          <Button
            onClick={handleMasterSync}
            disabled={syncing}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 whitespace-nowrap"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Szinkronizálás...' : 'Szinkronizálás most'}
          </Button>
        </div>
      </Card>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Filter className="w-4 h-4 text-slate-500" />
            <label className="text-sm font-semibold text-slate-600 whitespace-nowrap">Beszállító:</label>
            <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Minden beszállító" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Minden beszállító</SelectItem>
                {uniqueSuppliers.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name || "—"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedSupplier !== "all" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedSupplier("all")}
                className="text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3 flex-1">
            <label className="text-sm font-semibold text-slate-600 whitespace-nowrap">Termékkör:</label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Minden termékkör" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Minden termékkör</SelectItem>
                {uniqueCategories.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name || "—"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCategory !== "all" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedCategory("all")}
                className="text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100 flex-wrap h-auto">
          <TabsTrigger value="open">Open ({openOrders.length})</TabsTrigger>
          <TabsTrigger value="closed">Closed ({closedOrders.length})</TabsTrigger>
          <TabsTrigger value="summary">📊 Összesítő</TabsTrigger>
          <TabsTrigger value="familytree">🌳 Rendelés &amp; Kamionok</TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="mt-4 space-y-4">
          {openOrders.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Card className="p-3 bg-blue-50">
                <div className="text-xs text-slate-600">Open Orders</div>
                <div className="text-2xl font-bold text-blue-700">{openMetrics.count}</div>
              </Card>
              <Card className="p-3 bg-slate-50">
                <div className="text-xs text-slate-600">Planned (t)</div>
                <div className="text-2xl font-bold text-slate-800">{openMetrics.tons.toFixed(0)}</div>
              </Card>
              <Card className="p-3 bg-slate-50">
                <div className="text-xs text-slate-600">Total Value (EUR)</div>
                <div className="text-2xl font-bold text-slate-800">
                  {openMetrics.value.toLocaleString("hu-HU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
              </Card>
              <Card className="p-3 bg-orange-50">
                <div className="text-xs text-slate-600">Customs Required</div>
                <div className="text-2xl font-bold text-orange-700">{openMetrics.customsCount}</div>
              </Card>
              <Card className="p-3 bg-slate-50">
                <div className="text-xs text-slate-600">Suppliers</div>
                <div className="text-2xl font-bold text-slate-800">{openMetrics.suppliers}</div>
              </Card>
            </div>
          )}
          <OrderbooksList orders={openOrders} lines={lines} trucks={trucks} onSelect={setSelectedOrderId} onDelete={() => qc.invalidateQueries({ queryKey: ['orderbooks'] })} />
        </TabsContent>

        <TabsContent value="closed" className="mt-4">
          <OrderbooksList orders={closedOrders} lines={lines} trucks={trucks} onSelect={setSelectedOrderId} isClosed />
        </TabsContent>

        <TabsContent value="summary" className="mt-4">
          <OrderbooksMasterSummary orders={orders} lines={lines} />
        </TabsContent>

        <TabsContent value="familytree" className="mt-4">
          <OrderbookFamilyTree orders={[...openOrders, ...closedOrders]} lines={lines} />
        </TabsContent>
      </Tabs>

      {selectedOrderId && (
        <OrderbookDetail
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onUpdated={() => qc.invalidateQueries({ queryKey: ['orderbooks'] })}
          trucks={trucks}
        />
      )}
    </div>
  );
}

// Row color palette options
const ROW_COLORS = [
  { key: "", label: "—", bg: "", border: "" },
  { key: "blue",   label: "Kék",    bg: "bg-blue-50",   border: "border-l-4 border-l-blue-400" },
  { key: "green",  label: "Zöld",   bg: "bg-green-50",  border: "border-l-4 border-l-emerald-400" },
  { key: "yellow", label: "Sárga",  bg: "bg-yellow-50", border: "border-l-4 border-l-yellow-400" },
  { key: "orange", label: "Narancs",bg: "bg-orange-50", border: "border-l-4 border-l-orange-400" },
  { key: "red",    label: "Piros",  bg: "bg-red-50",    border: "border-l-4 border-l-red-400" },
  { key: "purple", label: "Lila",   bg: "bg-purple-50", border: "border-l-4 border-l-purple-400" },
  { key: "pink",   label: "Rózsaszín", bg: "bg-pink-50",border: "border-l-4 border-l-pink-400" },
  { key: "teal",   label: "Türkiz", bg: "bg-teal-50",   border: "border-l-4 border-l-teal-400" },
];

function ColorDot({ colorKey, onClick }) {
  const c = ROW_COLORS.find(r => r.key === colorKey) || ROW_COLORS[0];
  const dotColors = {
    "": "bg-slate-200",
    blue: "bg-blue-400", green: "bg-emerald-400", yellow: "bg-yellow-400",
    orange: "bg-orange-400", red: "bg-red-400", purple: "bg-purple-400",
    pink: "bg-pink-400", teal: "bg-teal-400"
  };
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        className={`w-4 h-4 rounded-full border border-white shadow ${dotColors[colorKey] || "bg-slate-200"} hover:scale-110 transition-transform`}
        title="Sor szín"
      />
      {open && (
        <div className="absolute left-0 top-6 z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-2 flex flex-wrap gap-1.5 w-36"
          onClick={e => e.stopPropagation()}>
          {ROW_COLORS.map(r => (
            <button
              key={r.key}
              title={r.label}
              onClick={() => { onClick(r.key); setOpen(false); }}
              className={`w-5 h-5 rounded-full border-2 ${dotColors[r.key] || "bg-slate-200"} ${r.key === colorKey ? 'border-slate-700 scale-110' : 'border-white'} hover:scale-110 transition-transform`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderbooksList({ orders, lines, trucks = [], onSelect, onDelete, isClosed }) {
  const [expandedId, setExpandedId] = useState(null);
  const [sortedOrders, setSortedOrders] = useState(null);
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const qc = useQueryClient();

  // Use local sorted state if set, else use prop orders
  const displayOrders = sortedOrders || orders;

  // Sync when orders prop changes (e.g., after refetch)
  React.useEffect(() => { setSortedOrders(null); }, [orders]);

  const handleDragStart = (idx) => setDragIdx(idx);
  const handleDragOver = (e, idx) => { e.preventDefault(); setDragOverIdx(idx); };
  const handleDrop = async (e, dropIdx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === dropIdx) { setDragIdx(null); setDragOverIdx(null); return; }
    const newOrder = [...displayOrders];
    const [moved] = newOrder.splice(dragIdx, 1);
    newOrder.splice(dropIdx, 0, moved);
    setSortedOrders(newOrder);
    setDragIdx(null); setDragOverIdx(null);
    // Persist sort_order
    for (let i = 0; i < newOrder.length; i++) {
      if (newOrder[i].sort_order !== i) {
        base44.entities.Orderbook.update(newOrder[i].id, { sort_order: i });
      }
    }
  };
  const handleDragEnd = () => { setDragIdx(null); setDragOverIdx(null); };

  const handleColorChange = async (order, colorKey) => {
    await base44.entities.Orderbook.update(order.id, { row_color: colorKey });
    qc.invalidateQueries({ queryKey: ['orderbooks'] });
  };

  if (!orders || orders.length === 0) {
    return <div className="text-center py-8 text-slate-500">No orders</div>;
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr className="text-left text-xs font-semibold text-slate-600">
              <th className="py-3 px-2 w-8"></th>
              <th className="py-3 px-4">Bész. rendelésszám</th>
              <th className="py-3 px-4">Belső szám</th>
              <th className="py-3 px-4">Beszállító</th>
              <th className="py-3 px-4">Dátum</th>
              <th className="py-3 px-4">Incoterms</th>
              <th className="py-3 px-4 text-right">Tervezett (t)</th>
              <th className="py-3 px-4 text-right">Érték (k EUR)</th>
              <th className="py-3 px-4 text-center">Vám</th>
              <th className="py-3 px-4 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {displayOrders.map((order, idx) => {
              const orderLines = lines.filter(l => l.orderbook_id === order.id);
              const plannedTons = orderLines.reduce((s, l) => s + (l.planned_quantity_tons || 0), 0);
              const allocatedTons = orderLines.reduce((s, l) => s + (l.allocated_quantity_tons || 0), 0);
              const valueEUR = orderLines.reduce((s, l) => s + (l.line_value_eur || 0), 0);
              const isExpanded = expandedId === order.id;
              const remainingTons = plannedTons - allocatedTons;
              const allocPct = plannedTons > 0 ? Math.round((allocatedTons / plannedTons) * 100) : 0;
              const colorDef = ROW_COLORS.find(r => r.key === order.row_color) || ROW_COLORS[0];
              const isDragging = dragIdx === idx;
              const isDragOver = dragOverIdx === idx;
              
              return (
                <React.Fragment key={order.id}>
                  <tr
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={`border-b transition-all
                      ${colorDef.bg} ${colorDef.border}
                      ${isDragging ? 'opacity-40' : ''}
                      ${isDragOver ? 'border-t-2 border-t-blue-400' : ''}
                      ${isExpanded ? 'brightness-95' : 'hover:brightness-95'}
                    `}
                  >
                    <td className="py-3 px-2 text-slate-300 cursor-grab active:cursor-grabbing">
                      <div className="flex items-center gap-1">
                        <GripVertical className="w-3.5 h-3.5" />
                        <ColorDot colorKey={order.row_color || ""} onClick={(c) => handleColorChange(order, c)} />
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {order.supplier_order_no || <span className="text-slate-400 font-normal italic">—</span>}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">{order.order_no}</td>
                    <td className="py-3 px-4 text-slate-700">
                      <div className="font-medium">{order.supplier_name}</div>
                      <div className="text-xs text-slate-500">{order.supplier_site_name}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{order.order_date}</td>
                    <td className="py-3 px-4 text-slate-600">{order.incoterms_type}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="font-semibold text-slate-800">{plannedTons.toFixed(2)}</div>
                      {plannedTons > 0 && (
                        <div className="text-xs text-slate-400">{allocPct}% allokált</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-800">{(valueEUR / 1000).toFixed(1)}</td>
                    <td className="py-3 px-4 text-center">
                      {order.customs_required && (
                        <Badge className="bg-orange-100 text-orange-800 text-xs">Igen</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {orderLines.length > 0 && (
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : order.id)}
                            className="text-slate-400 hover:text-slate-700 p-1 rounded"
                            title="Termékkörök mutatása"
                          >
                            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                        <Button size="sm" variant="ghost" className="text-blue-600" onClick={() => onSelect(order.id)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                   <tr className={`border-b ${colorDef.bg} opacity-90`}>
                     <td colSpan="10" className="px-6 py-3">
                       <div className="space-y-4">
                         {/* Termékkörök összesítése */}
                         <div className="space-y-2">
                           <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Termékkörök összesítése</div>
                           {orderLines.map(line => {
                            const pct = line.planned_quantity_tons > 0
                              ? Math.round(((line.allocated_quantity_tons || 0) / line.planned_quantity_tons) * 100)
                              : 0;
                            const remaining = (line.planned_quantity_tons || 0) - (line.allocated_quantity_tons || 0);
                            return (
                              <div key={line.id} className="flex items-center gap-3">
                                <div className="w-36 text-sm font-medium text-slate-700 truncate">{line.category_name || '—'}</div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <div className="h-2 flex-1 bg-slate-200 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-500' : 'bg-amber-400'}`}
                                        style={{ width: `${Math.min(pct, 100)}%` }}
                                      />
                                    </div>
                                    <span className={`text-xs font-bold w-10 text-right ${pct >= 100 ? 'text-emerald-600' : pct >= 50 ? 'text-blue-600' : 'text-amber-600'}`}>{pct}%</span>
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    <span className="font-medium text-blue-700">{(line.allocated_quantity_tons || 0).toFixed(2)} t</span>
                                    {' / '}
                                    <span>{line.planned_quantity_tons?.toFixed(2)} t tervezett</span>
                                    {remaining > 0.01 && <span className="ml-2 text-amber-600">· {remaining.toFixed(2)} t szabad</span>}
                                    {remaining <= 0 && remaining > -0.01 && <span className="ml-2 text-emerald-600">· Teljes</span>}
                                  </div>
                                </div>
                                <div className="text-right text-xs text-slate-500 w-24">
                                  {(line.unit_price_eur_per_ton || 0).toFixed(2)} EUR/t
                                </div>
                              </div>
                            );
                          })}
                          <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
                            <div className="w-36 text-xs font-bold text-slate-600 uppercase">Összesen</div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <div className="h-2 flex-1 bg-slate-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${allocPct >= 100 ? 'bg-emerald-500' : allocPct >= 50 ? 'bg-blue-500' : 'bg-amber-400'}`}
                                    style={{ width: `${Math.min(allocPct, 100)}%` }}
                                  />
                                </div>
                                <span className={`text-xs font-bold w-10 text-right ${allocPct >= 100 ? 'text-emerald-600' : allocPct >= 50 ? 'text-blue-600' : 'text-amber-600'}`}>{allocPct}%</span>
                              </div>
                              <div className="text-xs text-slate-600 font-semibold">
                                {allocatedTons.toFixed(2)} t / {plannedTons.toFixed(2)} t · marad: {remainingTons.toFixed(2)} t
                              </div>
                            </div>
                            <div className="text-right text-xs font-semibold text-slate-700 w-24">
                             {(valueEUR / 1000).toFixed(1)} k EUR
                            </div>
                            </div>
                            </div>

                            {/* Előjegyzett kamionok */}
                            {(() => {
                            const orderTrucks = trucks.filter(t => t.orderbook_id === order.id && t.status !== 'cancelled');
                            if (orderTrucks.length === 0) return null;
                            return (
                              <div className="space-y-2 pt-3 border-t border-slate-200">
                                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                  🚛 Előjegyzett kamionok ({orderTrucks.length})
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {orderTrucks.map(t => (
                                    <div key={t.id} className="bg-white rounded-lg border border-slate-200 p-2.5 text-xs">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-slate-800">{t.truck_number || '—'}</span>
                                        <Badge className={
                                          t.status === 'booked' ? 'bg-slate-100 text-slate-700' :
                                          t.status === 'loaded' ? 'bg-orange-100 text-orange-700' :
                                          t.status === 'closed' ? 'bg-emerald-100 text-emerald-700' :
                                          'bg-slate-100 text-slate-600'
                                        }>
                                          {t.status === 'booked' ? 'Előjegyzett' : 
                                           t.status === 'loaded' ? 'Megrakott' : 
                                           t.status === 'closed' ? 'Lezárt' : t.status}
                                        </Badge>
                                      </div>
                                      <div className="text-slate-600 space-y-0.5">
                                        <div>📦 {t.planned_quantity_tons || 0} t</div>
                                        <div>🚚 {t.carrier_name || '—'}</div>
                                        <div>📅 {t.expected_loading_date || t.loading_date || '—'}</div>
                                        {t.destination_city && <div>📍 {t.destination_country} · {t.destination_city}</div>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}