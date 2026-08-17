import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vin = searchParams.get('vin');

  if (!vin || vin.length !== 17) {
    return NextResponse.json(
      { error: 'VIN must be exactly 17 characters' },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${encodeURIComponent(vin)}?format=json`,
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: 'NHTSA API error' },
        { status: 502 },
      );
    }

    const data = await res.json();
    const results: Record<string, string> = {};

    for (const item of data.Results ?? []) {
      const val = item.Value?.trim();
      if (val && val !== 'Not Applicable' && val !== '' && !val.startsWith('9')) {
        results[item.Variable] = val;
      }
    }

    return NextResponse.json({
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
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to reach NHTSA API' },
      { status: 502 },
    );
  }
}
