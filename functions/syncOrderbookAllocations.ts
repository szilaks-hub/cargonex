import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Called when a Truck is created/updated
// Recalculates allocated_quantity_tons for each OrderbookLine based on closed trucks
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    const truck = data;
    if (!truck?.orderbook_id) {
      return Response.json({ skipped: true, reason: "No orderbook_id on truck" });
    }

    const orderbookId = truck.orderbook_id;

    // Get all trucks for this orderbook
    const allTrucks = await base44.asServiceRole.entities.Truck.filter({ orderbook_id: orderbookId });

    // Get all orderbook lines
    const lines = await base44.asServiceRole.entities.OrderbookLine.filter({ orderbook_id: orderbookId });

    // For each line: sum actual/planned tons from closed trucks that match category
    // Trucks store product_id, but orderbook lines store category_id
    // We match via product → category
    // Get all products to resolve category
    const products = await base44.asServiceRole.entities.Product.list();
    const productMap = {};
    for (const p of products) productMap[p.id] = p;

    // Build map: category_id -> allocated tons from closed trucks
    const categoryAllocated = {};
    for (const t of allTrucks) {
      if (t.status !== 'closed') continue;
      const product = productMap[t.product_id];
      if (!product) continue;
      const catId = product.category_id;
      if (!catId) continue;
      const tons = t.actual_weight_tons || t.planned_quantity_tons || 0;
      categoryAllocated[catId] = (categoryAllocated[catId] || 0) + tons;
    }

    // Update each line's allocated_quantity_tons
    for (const line of lines) {
      const allocated = categoryAllocated[line.category_id] || 0;
      if (Math.abs((line.allocated_quantity_tons || 0) - allocated) > 0.001) {
        await base44.asServiceRole.entities.OrderbookLine.update(line.id, {
          allocated_quantity_tons: allocated
        });
      }
    }

    // Also update orderbook total_allocated_tons
    const totalAllocated = Object.values(categoryAllocated).reduce((s, v) => s + v, 0);
    await base44.asServiceRole.entities.Orderbook.update(orderbookId, {
      total_allocated_tons: totalAllocated
    });

    return Response.json({ success: true, orderbookId, lines: lines.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});