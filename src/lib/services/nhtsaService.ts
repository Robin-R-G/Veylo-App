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

export async function fetchRecalls(make: string, model: string, modelYear: number): Promise<Recall[]> {
  const url = `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${modelYear}`;
  const res = await fetch(url);

  if (!res.ok) return [];

  const data = await res.json();
  return (data.results ?? []).map((r: Record<string, string>) => ({
    campaignNumber: r.NHTSACampaignNumber ?? '',
    summary: r.Summary ?? '',
    consequence: r.Consequence ?? '',
    remedy: r.Remedy ?? '',
    reportDate: r.ReportReceivedDate ?? '',
    component: r.Component ?? '',
  }));
}
