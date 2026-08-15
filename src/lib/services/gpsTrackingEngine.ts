import { GPSPoint } from '@/types';

// Earth's mean radius in kilometers
const EARTH_RADIUS_KM = 6371.0;

/**
 * Calculates geodesic distance between two coordinates using the Haversine formula.
 * Returns distance in kilometers (rounded to 3 decimal places).
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const rLat1 = (lat1 * Math.PI) / 180;
  const rLat2 = (lat2 * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  return Math.round(distance * 1000) / 1000;
}

export interface GpsFilterResult {
  accepted: boolean;
  filteredReason?: string;
  distanceDeltaKm: number;
  isSuspicious: boolean;
  suspiciousReason?: string;
}

/**
 * Filters incoming raw GPS readings to eliminate GPS drift, bad accuracy, impossible speeds, and jitter.
 */
export function filterAndValidateGpsPoint(
  lastAcceptedPoint: GPSPoint | null,
  newPoint: GPSPoint
): GpsFilterResult {
  // 1. Accuracy Check: reject points with horizontal accuracy > 35 meters
  if (newPoint.accuracy > 35) {
    return {
      accepted: false,
      filteredReason: `Low GPS accuracy (${Math.round(newPoint.accuracy)}m > 35m threshold)`,
      distanceDeltaKm: 0,
      isSuspicious: false,
    };
  }

  // First point of the trip is always accepted
  if (!lastAcceptedPoint) {
    return {
      accepted: true,
      distanceDeltaKm: 0,
      isSuspicious: false,
    };
  }

  // 2. Duplicate coordinate check
  if (
    lastAcceptedPoint.latitude === newPoint.latitude &&
    lastAcceptedPoint.longitude === newPoint.longitude
  ) {
    return {
      accepted: false,
      filteredReason: 'Identical coordinates (zero movement)',
      distanceDeltaKm: 0,
      isSuspicious: false,
    };
  }

  // 3. Time elapsed
  const timeDeltaSeconds = (newPoint.timestamp - lastAcceptedPoint.timestamp) / 1000;
  if (timeDeltaSeconds <= 0) {
    return {
      accepted: false,
      filteredReason: 'Invalid timestamp sequence',
      distanceDeltaKm: 0,
      isSuspicious: true,
      suspiciousReason: 'Negative or zero time delta between GPS readings',
    };
  }

  const rawDistKm = calculateHaversineDistanceKm(
    lastAcceptedPoint.latitude,
    lastAcceptedPoint.longitude,
    newPoint.latitude,
    newPoint.longitude
  );

  // 4. GPS Drift / Jitter filter: ignore tiny movements under 5 meters (0.005 km)
  if (rawDistKm < 0.005) {
    return {
      accepted: false,
      filteredReason: 'Stationary GPS jitter (< 5 meters)',
      distanceDeltaKm: 0,
      isSuspicious: false,
    };
  }

  // 5. Speed Sanity Check (Max speed 180 km/h = 0.05 km/s)
  const speedKmh = (rawDistKm / (timeDeltaSeconds / 3600));
  if (speedKmh > 180) {
    return {
      accepted: false,
      filteredReason: `Impossible vehicle speed detected (${Math.round(speedKmh)} km/h)`,
      distanceDeltaKm: 0,
      isSuspicious: true,
      suspiciousReason: `Speed of ${Math.round(speedKmh)} km/h exceeds 180 km/h vehicle limit`,
    };
  }

  // 6. Huge distance jump check (> 5 km in under 1 minute)
  if (rawDistKm > 5.0 && timeDeltaSeconds < 60) {
    return {
      accepted: false,
      filteredReason: 'Extreme location teleportation jump',
      distanceDeltaKm: 0,
      isSuspicious: true,
      suspiciousReason: `Teleportation of ${rawDistKm.toFixed(2)} km in ${timeDeltaSeconds}s`,
    };
  }

  return {
    accepted: true,
    distanceDeltaKm: rawDistKm,
    isSuspicious: false,
  };
}

/**
 * Realistic sequential route waypoints for Kozhikode, Kerala for simulation and preview
 */
export const KOZHIKODE_SAMPLE_ROUTE = [
  { lat: 11.2588, lng: 75.7804, name: 'Kozhikode Beach Main' },
  { lat: 11.2612, lng: 75.7845, name: 'Gandhi Road Junction' },
  { lat: 11.2654, lng: 75.7892, name: 'PT Usha Road' },
  { lat: 11.2701, lng: 75.7950, name: 'Mavoor Road Junction' },
  { lat: 11.2758, lng: 75.8012, name: 'Arayidathupalam' },
  { lat: 11.2825, lng: 75.8105, name: 'Baby Memorial Hospital' },
  { lat: 11.2890, lng: 75.8210, name: 'Pottammal Junction' },
  { lat: 11.2950, lng: 75.8320, name: 'Thondayad Bypass' },
  { lat: 11.3020, lng: 75.8450, name: 'Cyberpark / HiLITE Mall' },
  { lat: 11.3100, lng: 75.8590, name: 'Pantheeramkavu Junction' },
];
