import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { carrier_id, origin_site_id, destination_country, loading_date } = await req.json();

    if (!carrier_id || !destination_country || !loading_date) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Query FreightSheets with matching criteria
    const sheets = await base44.entities.FreightSheet.filter({
      carrier_id: carrier_id,
      destination_country: destination_country,
      status: 'active'
    });

    // Filter by date and select most recent valid_from
    const validSheets = sheets.filter(sheet => {
      const loadDate = new Date(loading_date);
      const validFrom = new Date(sheet.valid_from);
      
      let isValid = validFrom <= loadDate;
      
      if (!sheet.valid_until_revoked && sheet.valid_to) {
        const validTo = new Date(sheet.valid_to);
        isValid = isValid && loadDate <= validTo;
      }
      
      return isValid;
    });

    if (validSheets.length === 0) {
      return Response.json({ error: 'No valid FreightSheet version found for this date' }, { status: 404 });
    }

    // Sort by valid_from descending and get the most recent
    const selectedSheet = validSheets.sort((a, b) => 
      new Date(b.valid_from) - new Date(a.valid_from)
    )[0];

    // Fetch lines for this sheet
    const lines = await base44.entities.FreightSheetLine.filter({
      sheet_id: selectedSheet.id,
      status: 'active'
    });

    return Response.json({
      sheet: selectedSheet,
      lines: lines
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});