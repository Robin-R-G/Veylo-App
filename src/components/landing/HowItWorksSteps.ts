export type ScreenStep = 'DISCOVER' | 'DETAILS' | 'SCAN' | 'RIDE' | 'COMPLETE' | 'PAYMENT';

export interface StepMeta {
  key: ScreenStep;
  screenIndex: number;
  stepGroupIndex: number;
  title: string;
  subtitle: string;
  durationMs: number;
  floatingChip: {
    icon: string;
    text: string;
    badge: string;
  };
}

export const STEPS: StepMeta[] = [
  {
    key: 'DISCOVER',
    screenIndex: 0,
    stepGroupIndex: 0,
    title: 'Discover Nearby Fleet',
    subtitle: 'Locate verified vehicles available around you on live map with real-time fuel and pricing.',
    durationMs: 3200,
    floatingChip: {
      icon: 'near_me',
      text: '12 vehicles nearby',
      badge: 'Available',
    },
  },
  {
    key: 'DETAILS',
    screenIndex: 1,
    stepGroupIndex: 0,
    title: 'Inspect Vehicle Specs',
    subtitle: 'Transparent vehicle mileage, official fuel benchmark rates, and fixed daily/hourly rates.',
    durationMs: 3000,
    floatingChip: {
      icon: 'verified',
      text: 'Honda Activa 6G',
      badge: '₹399/day',
    },
  },
  {
    key: 'SCAN',
    screenIndex: 2,
    stepGroupIndex: 1,
    title: 'Scan QR & Unlock',
    subtitle: 'Point phone at the vehicle QR sticker. Immediate odometer logging with zero paper forms.',
    durationMs: 3200,
    floatingChip: {
      icon: 'qr_code_scanner',
      text: 'QR Verified: KL 16 P 78',
      badge: 'Instant',
    },
  },
  {
    key: 'RIDE',
    screenIndex: 3,
    stepGroupIndex: 2,
    title: 'Live GPS & Ride Telemetry',
    subtitle: 'Track live distance, trip duration, speed, and automatic fuel cost calculation in real time.',
    durationMs: 4200,
    floatingChip: {
      icon: 'navigation',
      text: 'Live GPS Tracking',
      badge: '38 km/h',
    },
  },
  {
    key: 'COMPLETE',
    screenIndex: 4,
    stepGroupIndex: 3,
    title: 'Ride Completed',
    subtitle: 'Instant breakdown calculation combining base rental, fuel consumption, and exact distance.',
    durationMs: 3200,
    floatingChip: {
      icon: 'check_circle',
      text: '18.4 km Completed',
      badge: '₹526 Total',
    },
  },
  {
    key: 'PAYMENT',
    screenIndex: 5,
    stepGroupIndex: 3,
    title: 'Instant UPI Settlement',
    subtitle: 'Direct peer-to-peer UPI transfer with zero commission and instant digital GST invoice receipt.',
    durationMs: 3400,
    floatingChip: {
      icon: 'payments',
      text: 'UPI Paid Successfully',
      badge: 'Direct Pay',
    },
  },
];

export const STEP_GROUPS = [
  {
    groupIndex: 0,
    number: '01',
    title: 'Find & Select Vehicle',
    description: 'Browse verified nearby vehicles with live availability, transparent rates, and official fuel benchmarks.',
    icon: 'travel_explore',
    screens: [0, 1],
  },
  {
    groupIndex: 1,
    number: '02',
    title: 'Scan QR & Unlock',
    description: 'Scan the vehicle sticker QR code. The app captures start odometer and unlocks your ride instantly.',
    icon: 'qr_code_scanner',
    screens: [2],
  },
  {
    groupIndex: 2,
    number: '03',
    title: 'Ride & Live Telemetry',
    description: 'Monitor live distance, GPS route tracking, and automated fuel calculations calculated in real time.',
    icon: 'route',
    screens: [3],
  },
  {
    groupIndex: 3,
    number: '04',
    title: 'Finish & Instant UPI Pay',
    description: 'Complete the trip with one tap. Automatic itemized digital invoice with direct owner UPI settlement.',
    icon: 'receipt_long',
    screens: [4, 5],
  },
];
