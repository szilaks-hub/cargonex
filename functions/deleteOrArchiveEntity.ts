import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Dependency map definitions
const DEPENDENCY_MAP = {
  PurchaseOrder: [
    { entity: 'OrderLine', field: 'order_id', label: 'Order Lines' },
    { entity: 'Truck', field: 'order_id', label: 'Logistics' },
    { entity: 'FinanceCustoms', field: 'order_id', label: 'Finance/Customs' }
  ],
  FreightSheet: [
    { entity: 'Truck', field: 'applied_freight_sheet_id', label: 'Logistics' }
  ],
  FreightSheetLine: [
    { entity: 'Truck', field: 'applied_freight_sheet_line_id', label: 'Logistics' }
  ],
  Partner: [
    { entity: 'Truck', field: 'carrier_id', label: 'Logistics (carrier)' },
    { entity: 'PurchaseOrder', field: 'supplier_id', label: 'Purchase Orders' },
    { entity: 'FreightSheet', field: 'carrier_id', label: 'Freight Sheets' }
  ],
  Product: [
    { entity: 'Truck', field: 'product_id', label: 'Logistics' },
    { entity: 'OrderLine', field: 'product_id', label: 'Order Lines' }
  ],
  Truck: [
    { entity: 'FinanceCustoms', field: 'logistics_truck_id', label: 'Finance/Customs' }
  ]
};

async function checkDependencies(base44, entityName, entityId) {
  const dependencies = DEPENDENCY_MAP[entityName];
  const snapshot = {};

  if (!dependencies) {
    return snapshot;
  }

  for (const dep of dependencies) {
    try {
      const records = await base44.asServiceRole.entities[dep.entity].filter({
        [dep.field]: entityId
      });
      snapshot[dep.label] = records.length;
    } catch (error) {
      snapshot[dep.label] = 0;
    }
  }

  return snapshot;
}

function canHardDelete(lockStatus, dependencySnapshot) {
  if (lockStatus.locked) {
    return false;
  }

  const totalDeps = Object.values(dependencySnapshot).reduce((sum, count) => sum + count, 0);
  return totalDeps === 0;
}

async function logAudit(base44, audit) {
  try {
    await base44.asServiceRole.entities.AuditLog.create(audit);
  } catch (error) {
    console.error('Audit log failed:', error.message);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entityName, entityId, requestedAction, reason } = await req.json();

    if (!entityName || !entityId) {
      return Response.json({ error: 'Missing entityName or entityId' }, { status: 400 });
    }

    // Get entity to check lock status
    let entity;
    try {
      const entities = await base44.asServiceRole.entities[entityName].filter({ id: entityId });
      entity = Array.isArray(entities) ? entities[0] : entities;
    } catch (e) {
      // Fallback: direct query
      return Response.json({ error: `Cannot fetch entity: ${e.message}` }, { status: 500 });
    }
    
    if (!entity) {
      return Response.json({ error: 'Entity not found' }, { status: 404 });
    }

    // Check dependencies
    const dependencySnapshot = await checkDependencies(base44, entityName, entityId);
    const totalDeps = Object.values(dependencySnapshot).reduce((sum, count) => sum + count, 0);

    // Determine what action can be performed
    let resultAction = null;
    let message = null;

    if (entity.locked) {
      return Response.json(
        {
          error: 'Entity is locked',
          message: `This ${entityName} is locked for accounting purposes. Only admins can unlock.`,
          canDelete: false,
          canArchive: false,
          locked: true
        },
        { status: 403 }
      );
    }

    if (requestedAction === 'HARD_DELETE') {
      if (canHardDelete({ locked: entity.locked }, dependencySnapshot)) {
        // Special case: PurchaseOrder with only OrderLines
        if (entityName === 'PurchaseOrder' && dependencySnapshot['Order Lines'] > 0 && 
            dependencySnapshot['Logistics'] === 0 && dependencySnapshot['Finance/Customs'] === 0) {
          // Cascade delete all order lines first
          const orderLines = await base44.asServiceRole.entities.OrderLine.filter({ order_id: entityId });
          for (const line of orderLines) {
            await base44.asServiceRole.entities.OrderLine.delete(line.id);
          }
        }

        // Perform hard delete
        await base44.asServiceRole.entities[entityName].delete(entityId);
        resultAction = 'HARD_DELETE';
        message = `${entityName} #${entityId} hard deleted.`;

        // Audit
        await logAudit(base44, {
          entity_name: entityName,
          entity_id: entityId,
          action: 'HARD_DELETE',
          user_id: user.email,
          timestamp: new Date().toISOString(),
          reason: reason || 'No dependencies',
          dependency_snapshot: dependencySnapshot
        });
      } else if (totalDeps > 0) {
        // Special case: PurchaseOrder with only OrderLines
        const onlyLines = entityName === 'PurchaseOrder' && 
                         dependencySnapshot['Order Lines'] > 0 && 
                         dependencySnapshot['Logistics'] === 0 && 
                         dependencySnapshot['Finance/Customs'] === 0;
        
        if (onlyLines) {
          // Allow hard delete with cascade
          return Response.json(
            {
              error: null,
              message: `This order has ${dependencySnapshot['Order Lines']} lines but no logistics/finance links.`,
              canDelete: true,
              canArchive: true,
              canCascadeDelete: true,
              dependencies: dependencySnapshot
            },
            { status: 200 }
          );
        }
        
        // Has non-line dependencies, only allow archive
        return Response.json(
          {
            error: 'Cannot hard delete',
            message: `This order has logistics, finance, or receipt links. Archive only.`,
            canDelete: false,
            canArchive: true,
            dependencies: dependencySnapshot
          },
          { status: 409 }
        );
      } else {
        return Response.json(
          {
            error: 'Cannot hard delete',
            message: 'Entity is locked or has unresolved dependencies.',
            canDelete: false,
            canArchive: false,
            locked: entity.locked
          },
          { status: 403 }
        );
      }
    } else if (requestedAction === 'ARCHIVE') {
      // Always allow archive if not locked
      const updateData = {
        status: 'archived',
        archived_at: new Date().toISOString(),
        archived_by: user.email
      };

      await base44.asServiceRole.entities[entityName].update(entityId, updateData);
      resultAction = 'ARCHIVE';
      message = `${entityName} #${entityId} archived.`;

      // Audit
      await logAudit(base44, {
        entity_name: entityName,
        entity_id: entityId,
        action: 'ARCHIVE',
        user_id: user.email,
        timestamp: new Date().toISOString(),
        reason: reason || 'Standard archive',
        dependency_snapshot: dependencySnapshot
      });
    } else if (requestedAction === 'FORCE_DELETE') {
      // Admin only, must provide reason
      if (user.role !== 'admin') {
        return Response.json(
          { error: 'Forbidden', message: 'Only admins can force delete.' },
          { status: 403 }
        );
      }

      if (!reason) {
        return Response.json(
          { error: 'Reason required', message: 'Force delete requires a reason.' },
          { status: 400 }
        );
      }

      if (canHardDelete({ locked: entity.locked }, dependencySnapshot)) {
        await base44.asServiceRole.entities[entityName].delete(entityId);
        resultAction = 'FORCE_DELETE';
        message = `${entityName} #${entityId} force deleted by admin.`;

        // Audit
        await logAudit(base44, {
          entity_name: entityName,
          entity_id: entityId,
          action: 'FORCE_DELETE',
          user_id: user.email,
          timestamp: new Date().toISOString(),
          reason: reason,
          dependency_snapshot: dependencySnapshot
        });
      } else {
        return Response.json(
          { error: 'Force delete failed', message: 'Entity has dependencies or is locked.' },
          { status: 400 }
        );
      }
    } else {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    return Response.json({
      success: true,
      action: resultAction,
      message: message,
      dependencies: dependencySnapshot
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});