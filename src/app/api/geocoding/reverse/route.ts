import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat and lon required' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`,
      { headers: { 'User-Agent': 'VeyloApp/1.0' } },
    );

    if (!res.ok) {
      return NextResponse.json({ error: 'Geocoding failed' }, { status: 502 });
    }

    const data = await res.json();
    const addr = data.address ?? {};

    return NextResponse.json({
      city: addr.city || addr.town || addr.village || addr.county || '',
      state: addr.state || '',
      country: addr.country || '',
      displayName: data.display_name || '',
    });
  } catch {
    return NextResponse.json({ error: 'Failed to reach geocoding service' }, { status: 502 });
  }
}
