export interface GeocodingResult {
  city: string;
  state: string;
  country: string;
  displayName: string;
}

export async function reverseGeocode(lat: number, lon: number): Promise<GeocodingResult> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`,
    { headers: { 'User-Agent': 'VeyloApp/1.0' } },
  );

  if (!res.ok) throw new Error('Geocoding failed');

  const data = await res.json();
  const addr = data.address ?? {};

  return {
    city: addr.city || addr.town || addr.village || addr.county || '',
    state: addr.state || '',
    country: addr.country || '',
    displayName: data.display_name || '',
  };
}
