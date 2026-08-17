export type PlanTier = 'FREE' | 'PRO' | 'BUSINESS';

export type UserRole = 'SUPER_ADMIN' | 'OWNER' | 'STAFF' | 'CUSTOMER';

// Application-level role for session/auth separation
export type AppRole = 'OWNER' | 'RIDER' | 'ADMIN';

export interface AppSession {
  role: AppRole;
  userId: string;
  name: string;
  phone?: string;
  email?: string;
  createdAt: string;
}

export interface RiderProfile {
  id: string;
  name: string;
  phone: string;
  email?: string;
  createdAt: string;
}

export type VehicleType = 'MOTORCYCLE' | 'SCOOTER' | 'CAR';

export type FuelType = 'PETROL' | 'DIESEL' | 'CNG' | 'ELECTRIC';

export type VehicleStatus = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'INACTIVE' | 'RENTAL_REQUESTED' | 'BLOCKED';

export type PricingMode = 'FUEL_COST' | 'PER_KM' | 'FUEL_PLUS_PER_KM' | 'FIXED' | 'CUSTOM';

export type PaymentStatus = 
  | 'PENDING' 
  | 'PAYMENT_INITIATED' 
  | 'PAYMENT_SUBMITTED' 
  | 'PAYMENT_PROCESSING' 
  | 'PAID' 
  | 'SUCCESS' 
  | 'FAILED' 
  | 'CANCELLED' 
  | 'REFUNDED' 
  | 'UNDER_REVIEW'
  | 'CASH_PENDING'
  | 'CASH_REPORTED'
  | 'CASH_CONFIRMED'
  | 'CASH_REJECTED';


export type TripStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'ACTIVE'
  | 'ENDING'
  | 'DISTANCE_CALCULATED'
  | 'CONFIRMATION_PENDING'
  | 'INVOICE_GENERATED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_PROCESSING'
  | 'PAYMENT_VERIFIED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'GPS_ERROR'
  | 'PAYMENT_FAILED'
  | 'UNDER_REVIEW'
  | 'DISPUTED';

export type GpsQuality = 'GOOD' | 'FAIR' | 'POOR' | 'UNAVAILABLE' | 'SUSPICIOUS';

export type DisputeStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED';

export interface Dispute {
  id: string;
  tripId: string;
  invoiceId?: string;
  raisedBy: 'RIDER' | 'OWNER';
  raisedByName: string;
  reason: string;
  claimedDistanceKm?: number;
  evidence?: string;
  status: DisputeStatus;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
}

export type IssueSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type IssueStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

export type IssueType = 'BRAKE' | 'TYRE' | 'ENGINE' | 'ELECTRICAL' | 'ACCIDENT' | 'DAMAGE' | 'FUEL' | 'OTHER';

export type ServiceType = 
  | 'ENGINE_OIL'
  | 'BRAKE_SERVICE'
  | 'TYRE_REPLACEMENT'
  | 'CHAIN_SERVICE'
  | 'BATTERY'
  | 'GENERAL_SERVICE'
  | 'INSURANCE_RENEWAL'
  | 'POLLUTION_CERTIFICATE'
  | 'OTHER';

export type AdPlacement = 
  | 'dashboard-bottom'
  | 'vehicle-bottom'
  | 'reports-bottom'
  | 'invoice-bottom'
  | 'public-page-bottom';

export interface Profile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  upiId?: string;
  upiPayeeName?: string;
  upiEnabled?: boolean;
  createdAt: string;
}

export type UpiStatus = 'NOT_CONFIGURED' | 'CONFIGURED' | 'VERIFICATION_REQUIRED' | 'ACTIVE' | 'SUSPENDED';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  planTier: PlanTier;
  businessName?: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  defaultState?: string; // e.g. "Kerala"
  defaultCity?: string;  // e.g. "Kozhikode"
  upiId?: string;
  upiPayeeName?: string;
  upiEnabled?: boolean;
  upiStatus?: UpiStatus;
  upiVerifiedAt?: string;
  upiUpdatedAt?: string;
  taxEnabled: boolean;
  gstin?: string;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  invoicePrefix: string;
  createdAt: string;
}

export interface PaymentAttempt {
  paymentId: string;
  tripId: string;
  invoiceId: string;
  ownerId: string;
  riderId: string;
  amount: number;
  currency: string;
  paymentMethod: string; // 'UPI_DIRECT' | 'CASH' | 'PAYMENT_GATEWAY' | etc.
  paymentDestination: string; // UPI ID or cash indicator
  status: PaymentStatus | 'PAYMENT_PROCESSING' | 'REFUNDED';
  providerReference?: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
}


export interface Vehicle {
  id: string;
  organizationId: string;
  ownerId: string;
  securePublicId: string;
  registrationNumber: string;
  normalizedRegNumber: string;
  vin?: string;
  vehicleType: VehicleType;
  make: string;
  model: string;
  manufacturingYear?: number;
  fuelType: FuelType;
  mileageKmpl: number;
  initialOdometer: number;
  currentOdometer: number;
  lastVerifiedOdometer: number;
  estimatedCurrentOdometer: number;
  ratePerKmRupees: number; // e.g. 12 for ₹12/km
  ownerUpiId?: string;
  requiresApproval?: boolean;
  state: string; // e.g. "Kerala"
  city: string;  // e.g. "Kozhikode"
  status: VehicleStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GPSPoint {
  id?: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed?: number | null; // meters per second
  heading?: number | null;
  timestamp: number;
  distanceFromLastPointKm?: number;
  isFiltered?: boolean;
}

export interface RentalTrip {
  id: string;
  vehicleId: string;
  vehicleRegNumber: string;
  vehicleModel: string;
  vehicleType: VehicleType;
  ownerId: string;
  ownerName?: string;
  ownerUpiId: string;
  riderId: string;
  riderName: string;
  riderPhone: string;
  
  startTime: string;
  endTime?: string;
  durationSeconds: number;

  startOdometer: number;
  gpsDistanceKm: number;
  estimatedEndOdometer: number;
  actualEndOdometer?: number;

  ratePerKmRupees: number;
  distanceChargeRupees: number;
  otherChargesRupees: number;
  totalAmountRupees: number;

  status: TripStatus;
  gpsTrackingStatus: 'ACTIVE' | 'WEAK_SIGNAL' | 'LOST' | 'STOPPED';
  isSuspicious: boolean;
  suspiciousReason?: string;

  startCoordinates?: { lat: number; lng: number };
  currentCoordinates?: { lat: number; lng: number };
  trackingPoints: GPSPoint[];

  invoiceId?: string;
  paymentStatus: PaymentStatus;
  upiDeepLink?: string;
  upiTransactionRef?: string;
  paidAt?: string;

  createdAt: string;
  updatedAt: string;
}

export interface OdometerRecord {
  id: string;
  vehicleId: string;
  previousReading: number;
  newReading: number;
  difference: number;
  updatedByProfileId?: string;
  updatedByName?: string;
  reason: 'RIDE_COMPLETED' | 'GPS_RIDE_COMPLETED' | 'MANUAL_UPDATE' | 'ADMIN_CORRECTION' | 'OWNER_VERIFIED';
  rideId?: string;
  tripId?: string;
  notes?: string;
  timestamp: string;
}

export type FuelPriceStatus = 'LIVE' | 'RECENT' | 'STALE' | 'UNAVAILABLE' | 'SOURCE_ERROR' | 'VALIDATION_ERROR';

export interface FuelPriceSnapshot {
  snapshotId: string;
  fuelType: FuelType;
  country: string;
  state: string;
  district?: string;
  city: string;
  pincode?: string;
  pricePerLitreRupees: number; // For compatibility
  priceRupees: number;
  pricePerUnitPaise: number;
  unit: 'LITRE' | 'KG';
  currency: string;
  source: string;
  sourceUrl?: string;
  effectiveAt: string;
  fetchedAt: string;
  status: FuelPriceStatus | 'verified' | 'cached' | 'fallback';
}

export interface FuelPrice {
  id: string;
  country: string;
  state: string;
  district?: string;
  city: string;
  pincode?: string;
  fuelType: FuelType;
  pricePerUnitPaise: number; // e.g. 11400 = ₹114.00
  priceRupees: number; // e.g. 114.00
  unit: 'LITRE' | 'KG';
  currency: string;
  sourceName: string; // IOCL, BPCL, HPCL, GoodReturns, etc.
  sourceUrl?: string;
  effectiveDate: string; // YYYY-MM-DD
  fetchedAt: string;
  status: FuelPriceStatus;
  fallbackReason?: string;
  createdAt: string;
  updatedAt: string;
  // Compatibility fields for existing code
  source?: string;
  effectiveAt?: string;
}

export interface FuelPriceHistoryItem {
  id: string;
  fuelPriceId?: string;
  fuelType: FuelType;
  country: string;
  state: string;
  district?: string;
  city: string;
  pincode?: string;
  priceRupees: number;
  pricePerUnitPaise: number;
  unit: 'LITRE' | 'KG';
  currency: string;
  sourceName: string;
  sourceUrl?: string;
  effectiveDate: string;
  recordedAt: string;
}

export interface FuelPriceAuditLog {
  id: string;
  eventType: 'FUEL_PRICE_UPDATED' | 'FUEL_PRICE_UPDATE_FAILED';
  fuelType: FuelType;
  country: string;
  state: string;
  district?: string;
  city: string;
  oldPriceRupees?: number;
  newPriceRupees?: number;
  sourceName: string;
  status: 'SUCCESS' | 'FAILED';
  errorMessage?: string;
  createdAt: string;
}


export interface Ride {
  id: string;
  vehicleId: string;
  organizationId: string;
  ownerId: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  startOdometer: number;
  endOdometer: number;
  distanceKm: number;
  fuelType: FuelType;
  mileageKmpl: number;
  
  priceSnapshot: FuelPriceSnapshot;
  
  estimatedFuelLitres: number;
  estimatedFuelCostPaise: number;
  pricePerKmPaise: number;
  pricingMode: PricingMode;
  perKmRateRupees?: number;
  fixedRateRupees?: number;
  additionalChargesRupees?: number;
  totalAmountPaise: number;
  totalAmountRupees: number;
  notes?: string;
  issueReported: boolean;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  completedAt?: string;
}

export interface Invoice {
  id: string;
  organizationId?: string;
  rideId?: string;
  tripId?: string;
  vehicleId: string;
  vehicleRegNumber: string;
  vehicleMakeModel: string;
  invoiceNumber: string;
  title: string;
  customerName: string;
  customerPhone?: string;
  startOdometer: number;
  endOdometer: number;
  distanceKm: number;
  mileageKmpl?: number;
  
  priceSnapshot?: FuelPriceSnapshot;
  
  estimatedFuelLitres?: number;
  estimatedFuelCostRupees?: number;
  pricingMode?: PricingMode;
  ratePerKmRupees?: number;
  perKmRateRupees?: number;
  additionalChargesRupees?: number;
  subtotalRupees: number;
  taxRupees: number;
  totalRupees: number;
  
  payeeUpiId?: string;
  payeeName?: string;
  upiDeepLink?: string;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  paymentReference?: string;
  tripStartTime?: string;  // ISO timestamp when trip started
  tripEndTime?: string;    // ISO timestamp when trip ended
  issuedAt: string;
  paidAt?: string;
  notes?: string;
  platformFeeRupees?: number;
}

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  serviceType: ServiceType;
  serviceDate: string;
  odometerReading: number;
  costRupees: number;
  notes?: string;
  nextDueDate?: string;
  nextDueOdometer?: number;
  createdAt: string;
}

export interface Issue {
  id: string;
  vehicleId: string;
  rideId?: string;
  reportedByProfileId?: string;
  reporterName?: string;
  issueType: IssueType;
  severity: IssueSeverity;
  description: string;
  status: IssueStatus;
  photoUrls?: string[];
  createdAt: string;
  resolvedAt?: string;
}

export interface VehicleHealthScore {
  score: number;
  stars: number;
  statusLabel: string;
  factors: {
    label: string;
    status: 'GOOD' | 'WARNING' | 'CRITICAL';
    detail: string;
  }[];
}

export interface AdConfiguration {
  id: string;
  placement: AdPlacement;
  enabled: boolean;
  provider: string;
  premiumExcluded: boolean;
  bannerTitle: string;
  bannerText: string;
  bannerUrl: string;
}

export interface FeatureFlags {
  onlinePayment: boolean;
  marketplaceSettlement: boolean;
  commission: boolean;
  gst: boolean;
  advertising: boolean;
  subscriptions: boolean;
  aiInsights: boolean;
  maintenance: boolean;
  gpsTracking: boolean;
}

export interface PlanEntitlements {
  maxVehicles: number;
  allowPdfDownload: boolean;
  allowStaffAccounts: boolean;
  allowCustomBranding: boolean;
  isAdFree: boolean;
  allowAdvancedAnalytics: boolean;
  allowTripEstimator: boolean;
}

export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED' | 'SUSPENDED';

export type PlatformRevenueType = 'SUBSCRIPTION' | 'PLATFORM_FEE' | 'PREMIUM_FEATURE' | 'ADVERTISING' | 'OTHER';

export interface SaaSPlan {
  id: string;
  name: string;
  pricePaise: number;
  priceRupees: number;
  billingInterval: 'MONTHLY' | 'YEARLY';
  vehicleLimit: number;
  staffLimit: number;
  gpsEnabled: boolean;
  advancedReports: boolean;
  customBranding: boolean;
  adsEnabled: boolean;
  prioritySupport: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  organizationId: string;
  planId: string;
  status: SubscriptionStatus;
  startedAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt?: string;
  provider: string;
  providerSubscriptionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformRevenueLog {
  id: string;
  organizationId?: string;
  amountPaise: number;
  amountRupees: number;
  currency: string;
  revenueType: PlatformRevenueType;
  referenceId?: string;
  createdAt: string;
}

export interface PaymentEvent {
  id: string;
  eventId: string;
  provider: string;
  eventType: string;
  payload: any;
  processedAt: string;
}

export interface PlatformMonetizationSettings {
  platformFeeEnabled: boolean;
  platformFeeType: 'PERCENTAGE' | 'FIXED' | 'NONE';
  platformFeeValue: number;
  advertisingEnabled: boolean;
  /** Configurable trial length in days (0 = no trial). Never hardcoded in app logic. */
  trialDays: number;
}

