import { createClient } from '@/lib/supabase/client';

export interface VinDecodeResult {
  vin: string;
  make: string;
  model: string;
  modelYear: string;
  bodyClass: string;
  engineCylinders: string;
  engineDisplacement: string;
  fuelTypePrimary: string;
  transmissionStyle: string;
  plantCity: string;
  manufacturerName: string;
  errorCodes: number[];
}

export async function decodeVin(vin: string): Promise<VinDecodeResult> {
  const res = await fetch(
    `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${encodeURIComponent(vin)}?format=json`,
  );

  if (!res.ok) throw new Error('NHTSA API error');

  const data = await res.json();
  const results: Record<string, string> = {};

  for (const item of data.Results ?? []) {
    const val = item.Value?.trim();
    if (val && val !== 'Not Applicable' && val !== '' && !val.startsWith('9')) {
      results[item.Variable] = val;
    }
  }

  return {
    vin,
    make: results['Make'] ?? '',
    model: results['Model'] ?? '',
    modelYear: results['Model Year'] ?? '',
    bodyClass: results['Body Class'] ?? '',
    engineCylinders: results['Engine Number of Cylinders'] ?? '',
    engineDisplacement: results['Displacement (L)'] ?? '',
    fuelTypePrimary: results['Fuel Type - Primary'] ?? '',
    transmissionStyle: results['Transmission Style'] ?? '',
    plantCity: results['Plant City'] ?? '',
    manufacturerName: results['Manufacturer Name'] ?? '',
    errorCodes: data.ErrorCodes ?? [],
  };
}

export interface Recall {
  campaignNumber: string;
  summary: string;
  consequence: string;
  remedy: string;
  reportDate: string;
  component: string;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function fetchRecalls(
  make: string,
  model: string,
  modelYear: number,
  vehicleId?: string,
): Promise<Recall[]> {
  // Try cache first if vehicleId provided
  if (vehicleId) {
    try {
      const supabase = createClient();
      const { data: cached } = await supabase
        .from('vehicle_recalls')
        .select('campaign_number, component, summary, consequence, remedy, report_date, fetched_at')
        .eq('vehicle_id', vehicleId)
        .order('fetched_at', { ascending: false });

      if (cached && cached.length > 0) {
        const freshest = new Date(cached[0].fetched_at).getTime();
        if (Date.now() - freshest < CACHE_TTL_MS) {
          return cached.map(r => ({
            campaignNumber: r.campaign_number,
            component: r.component ?? '',
            summary: r.summary ?? '',
            consequence: r.consequence ?? '',
            remedy: r.remedy ?? '',
            reportDate: r.report_date ?? '',
          }));
        }
      }
    } catch {
      // Cache read failed, fall through to NHTSA
    }
  }

  // Fetch from NHTSA
  const url = `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${modelYear}`;
  const res = await fetch(url);

  if (!res.ok) return [];

  const data = await res.json();
  const recalls: Recall[] = (data.results ?? []).map((r: Record<string, string>) => ({
    campaignNumber: r.NHTSACampaignNumber ?? '',
    summary: r.Summary ?? '',
    consequence: r.Consequence ?? '',
    remedy: r.Remedy ?? '',
    reportDate: r.ReportReceivedDate ?? '',
    component: r.Component ?? '',
  }));

  // Cache in Supabase
  if (vehicleId && recalls.length > 0) {
    try {
      const supabase = createClient();
      // Delete old cached recalls for this vehicle
      await supabase.from('vehicle_recalls').delete().eq('vehicle_id', vehicleId);
      // Insert fresh recalls
      await supabase.from('vehicle_recalls').insert(
        recalls.map(r => ({
          vehicle_id: vehicleId,
          campaign_number: r.campaignNumber,
          component: r.component,
          summary: r.summary,
          consequence: r.consequence,
          remedy: r.remedy,
          report_date: r.reportDate,
        })),
      );
    } catch {
      // Cache write failed silently
    }
  }

  return recalls;
}
