import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Called when a Truck is created/updated/deleted
// Recalculates allocated_quantity_tons (all active trucks) for each OrderbookLine
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

    // Active trucks (not cancelled): planned quantity counts as "allocated"
    // Closed trucks: actual weight (or planned if no actual) counts as delivered
    // We sum by category using the truck's items array, or fallback to product_id -> category

    const products = await base44.asServiceRole.entities.Product.list();
    const productMap = {};
    for (const p of products) productMap[p.id] = p;

    // Build maps: category_id -> { allocated_tons (all active non-cancelled), delivered_tons (closed) }
    const categoryAllocated = {};  // all active (booked/loaded/in-transit etc.) planned tons
    const categoryDelivered = {};  // closed: actual weight

    for (const t of allTrucks) {
      if (t.status === 'cancelled') continue;

      const resolveCategoryId = (productId) => {
        const product = productMap[productId];
        return product?.category_id || null;
      };

      // Determine which categories this truck covers
      let categoryTons = []; // [{category_id, tons}]

      if (t.items && t.items.length > 0) {
        for (const item of t.items) {
          const catId = item.category_id || (item.product_id ? resolveCategoryId(item.product_id) : null);
          if (catId) {
            categoryTons.push({ category_id: catId, tons: item.quantity_tons || 0 });
          }
        }
        // If items have no categories, fallback to truck-level
        if (categoryTons.length === 0 && t.product_id) {
          const catId = resolveCategoryId(t.product_id);
          if (catId) categoryTons.push({ category_id: catId, tons: t.planned_quantity_tons || 0 });
        }
      } else if (t.product_id) {
        const catId = resolveCategoryId(t.product_id);
        if (catId) categoryTons.push({ category_id: catId, tons: t.planned_quantity_tons || 0 });
      } else {
        // No product info: allocate to first line category if only 1 line
        if (lines.length === 1) {
          categoryTons.push({ category_id: lines[0].category_id, tons: t.planned_quantity_tons || 0 });
        }
      }

      for (const { category_id, tons } of categoryTons) {
        // Use actual_weight_tons for loaded/closed trucks, planned for booked
        const effectiveTons = (t.status === 'loaded' || t.status === 'closed') && t.actual_weight_tons
          ? (t.actual_weight_tons / (t.planned_quantity_tons || 1)) * tons
          : tons;
        
        categoryAllocated[category_id] = (categoryAllocated[category_id] || 0) + effectiveTons;

        if (t.status === 'closed') {
          const actualTons = t.actual_weight_tons || t.planned_quantity_tons || 0;
          // Ratio of actual vs planned for this truck
          const ratio = (t.planned_quantity_tons || 0) > 0 ? (actualTons / t.planned_quantity_tons) : 1;
          const deliveredForCat = tons * ratio;
          categoryDelivered[category_id] = (categoryDelivered[category_id] || 0) + deliveredForCat;
        }
      }
    }

    // Update each line's allocated_quantity_tons (all active planned) 
    for (const line of lines) {
      const allocated = categoryAllocated[line.category_id] || 0;
      if (Math.abs((line.allocated_quantity_tons || 0) - allocated) > 0.001) {
        await base44.asServiceRole.entities.OrderbookLine.update(line.id, {
          allocated_quantity_tons: allocated
        });
      }
    }

    // Also update orderbook total_allocated_tons (delivered/closed only)
    const totalDelivered = Object.values(categoryDelivered).reduce((s, v) => s + v, 0);
    const totalAllocated = Object.values(categoryAllocated).reduce((s, v) => s + v, 0);
    
    await base44.asServiceRole.entities.Orderbook.update(orderbookId, {
      total_allocated_tons: totalDelivered
    });

    return Response.json({ success: true, orderbookId, lines: lines.length, totalAllocated, totalDelivered });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});