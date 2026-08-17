interface LocationResult {
  lat: number;
  lng: number;
  city: string;
  state: string;
}

const STATE_COORDS: Record<string, { lat: number; lng: number; name: string }> = {
  'Kerala': { lat: 10.8505, lng: 76.2711, name: 'Kerala' },
  'Karnataka': { lat: 15.3173, lng: 75.7139, name: 'Karnataka' },
  'Tamil Nadu': { lat: 11.1271, lng: 78.6569, name: 'Tamil Nadu' },
  'Maharashtra': { lat: 19.7515, lng: 75.7139, name: 'Maharashtra' },
  'Delhi': { lat: 28.7041, lng: 77.1025, name: 'Delhi' },
  'Goa': { lat: 15.2993, lng: 74.124, name: 'Goa' },
  'Telangana': { lat: 17.1233, lng: 79.2088, name: 'Telangana' },
  'Andhra Pradesh': { lat: 15.9129, lng: 79.74, name: 'Andhra Pradesh' },
  'Rajasthan': { lat: 27.0238, lng: 74.2179, name: 'Rajasthan' },
  'Gujarat': { lat: 22.2587, lng: 71.1924, name: 'Gujarat' },
  'West Bengal': { lat: 22.9868, lng: 87.855, name: 'West Bengal' },
  'Uttar Pradesh': { lat: 26.8467, lng: 80.9462, name: 'Uttar Pradesh' },
  'Madhya Pradesh': { lat: 22.9734, lng: 78.6569, name: 'Madhya Pradesh' },
  'Punjab': { lat: 31.1471, lng: 75.3412, name: 'Punjab' },
  'Haryana': { lat: 29.0588, lng: 76.0856, name: 'Haryana' },
};

const CITY_COORDS: Record<string, { lat: number; lng: number; state: string }> = {
  'Kozhikode': { lat: 11.2588, lng: 75.7804, state: 'Kerala' },
  'Thiruvananthapuram': { lat: 8.5241, lng: 76.9366, state: 'Kerala' },
  'Kochi': { lat: 9.9312, lng: 76.2673, state: 'Kerala' },
  'Kannur': { lat: 11.8745, lng: 75.3704, state: 'Kerala' },
  'Bangalore': { lat: 12.9716, lng: 77.5946, state: 'Karnataka' },
  'Mysore': { lat: 12.2958, lng: 76.6394, state: 'Karnataka' },
  'Chennai': { lat: 13.0827, lng: 80.2707, state: 'Tamil Nadu' },
  'Coimbatore': { lat: 11.0168, lng: 76.9558, state: 'Tamil Nadu' },
  'Mumbai': { lat: 19.076, lng: 72.8777, state: 'Maharashtra' },
  'Pune': { lat: 18.5204, lng: 73.8567, state: 'Maharashtra' },
  'Hyderabad': { lat: 17.385, lng: 78.4867, state: 'Telangana' },
  'Delhi': { lat: 28.7041, lng: 77.1025, state: 'Delhi' },
};

function findNearestCity(lat: number, lng: number): { city: string; state: string } {
  let minDist = Infinity;
  let nearest = { city: 'Kozhikode', state: 'Kerala' };

  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    const dLat = lat - coords.lat;
    const dLng = lng - coords.lng;
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);
    if (dist < minDist) {
      minDist = dist;
      nearest = { city, state: coords.state };
    }
  }

  return nearest;
}

class GeolocationService {
  private cachedLocation: LocationResult | null = null;

  async getCurrentPosition(): Promise<LocationResult | null> {
    if (this.cachedLocation) return this.cachedLocation;

    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const { city, state } = findNearestCity(lat, lng);
          this.cachedLocation = { lat, lng, city, state };
          resolve(this.cachedLocation);
        },
        () => { resolve(null); },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
      );
    });
  }

  async getCityState(): Promise<{ city: string; state: string }> {
    const loc = await this.getCurrentPosition();
    return loc ? { city: loc.city, state: loc.state } : { city: 'Kozhikode', state: 'Kerala' };
  }

  clearCache() {
    this.cachedLocation = null;
  }
}

export const geolocationService = new GeolocationService();
