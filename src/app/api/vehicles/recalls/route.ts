import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const make = searchParams.get('make');
  const model = searchParams.get('model');
  const modelYear = searchParams.get('modelYear');

  if (!make || !model || !modelYear) {
    return NextResponse.json(
      { error: 'make, model, and modelYear are required' },
      { status: 400 },
    );
  }

  try {
    const url = `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${encodeURIComponent(modelYear)}`;
    const res = await fetch(url);

    if (!res.ok) {
      return NextResponse.json({ recalls: [], error: 'NHTSA API error' }, { status: 502 });
    }

    const data = await res.json();
    const recalls = (data.results ?? []).map((r: Record<string, string>) => ({
      campaignNumber: r.NHTSACampaignNumber ?? '',
      summary: r.Summary ?? '',
      consequence: r.Consequence ?? '',
      remedy: r.Remedy ?? '',
      reportDate: r.ReportReceivedDate ?? '',
      component: r.Component ?? '',
    }));

    return NextResponse.json({ recalls });
  } catch {
    return NextResponse.json({ recalls: [], error: 'Failed to reach NHTSA API' }, { status: 502 });
  }
}
