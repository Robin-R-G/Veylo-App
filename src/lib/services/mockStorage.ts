import { 
  Vehicle, 
  OdometerRecord, 
  Ride, 
  Invoice, 
  MaintenanceRecord, 
  Issue, 
  AdConfiguration, 
  FeatureFlags,
  PlanTier,
  Organization,
  PricingMode,
  FuelPriceSnapshot,
  PaymentStatus,
  RentalTrip,
  VehicleStatus,
  RiderProfile,
  Dispute,
  DisputeStatus,
  FuelPrice,
  FuelPriceHistoryItem,
  FuelPriceAuditLog,
  FuelType,
  PaymentAttempt,
  UpiStatus
} from '@/types';


import { normalizeRegistrationNumber } from './registrationNormalizer';
import { calculateRideCosts, generateUpiDeepLink } from './financialEngine';

const STORAGE_KEY = 'veylo_saas_store_v2';

export interface AppState {
  currentTier: PlanTier;
  organization: Organization;
  vehicles: Vehicle[];
  odometerHistory: OdometerRecord[];
  rides: Ride[];
  rentalTrips: RentalTrip[];
  invoices: Invoice[];
  maintenanceRecords: MaintenanceRecord[];
  issues: Issue[];
  adConfigurations: AdConfiguration[];
  featureFlags: FeatureFlags;
  riders: RiderProfile[];
  disputes: Dispute[];
  fuelPrices: FuelPrice[];
  fuelPriceHistory: FuelPriceHistoryItem[];
  fuelPriceAuditLogs: FuelPriceAuditLog[];
  paymentAttempts: PaymentAttempt[];
}


const DEFAULT_SNAPSHOT: FuelPriceSnapshot = {
  snapshotId: 'snap_init_10420',
  fuelType: 'PETROL',
  country: 'India',
  state: 'Kerala',
  city: 'Kozhikode',
  pricePerLitreRupees: 104.20,
  priceRupees: 104.20,
  pricePerUnitPaise: 10420,
  unit: 'LITRE',
  currency: 'INR',
  source: 'Indian API (fuel.indianapi.in)',
  effectiveAt: '2026-08-15T10:30:00Z',
  fetchedAt: '2026-08-15T10:30:00Z',
  status: 'verified',
};


const INITIAL_STATE: AppState = {
  currentTier: 'FREE',
  organization: {
    id: 'org_demo_1',
    name: 'Veylo Fleet Solutions',
    slug: 'veylo-fleet',
    planTier: 'FREE',
    businessName: 'Veylo Vehicle Rentals',
    email: 'owner@veylo.com',
    phone: '+91 98765 43210',
    defaultState: 'Kerala',
    defaultCity: 'Kozhikode',
    upiId: 'vehicleowner@upi',
    upiPayeeName: 'Vehicle Owner',
    upiEnabled: true,
    taxEnabled: false,
    cgstRate: 0,
    sgstRate: 0,
    igstRate: 0,
    invoicePrefix: 'INV',
    createdAt: new Date().toISOString(),
  },
  vehicles: [
    {
      id: 'v_kl08ab1234',
      organizationId: 'org_demo_1',
      ownerId: 'prof_owner_1',
      securePublicId: 'pub_kl08ab1234_z77c',
      registrationNumber: 'KL 08 AB 1234',
      normalizedRegNumber: 'KL08AB1234',
      vehicleType: 'SCOOTER',
      make: 'Honda',
      model: 'Activa 6G',
      manufacturingYear: 2023,
      fuelType: 'PETROL',
      mileageKmpl: 45,
      initialOdometer: 42000,
      currentOdometer: 42580,
      lastVerifiedOdometer: 42580,
      estimatedCurrentOdometer: 42580,
      ratePerKmRupees: 12,
      ownerUpiId: 'vehicleowner@upi',
      requiresApproval: false,
      state: 'Kerala',
      city: 'Kozhikode',
      status: 'AVAILABLE',
      notes: 'Available for immediate rental at Kozhikode beach hub.',
      createdAt: '2026-08-01T08:00:00Z',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'v_kl16p78',
      organizationId: 'org_demo_1',
      ownerId: 'prof_owner_1',
      securePublicId: 'pub_kl16p78_x99a',
      registrationNumber: 'KL 16 P 78',
      normalizedRegNumber: 'KL16P78',
      vehicleType: 'MOTORCYCLE',
      make: 'Royal Enfield',
      model: 'Classic 350',
      manufacturingYear: 2023,
      fuelType: 'PETROL',
      mileageKmpl: 40,
      initialOdometer: 12500,
      currentOdometer: 12560,
      lastVerifiedOdometer: 12560,
      estimatedCurrentOdometer: 12560,
      ratePerKmRupees: 15,
      ownerUpiId: 'vehicleowner@upi',
      requiresApproval: false,
      state: 'Kerala',
      city: 'Kozhikode',
      status: 'AVAILABLE',
      notes: 'Primary daily cruiser bike. Kozhikode location.',
      createdAt: '2026-08-01T08:00:00Z',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'v_mh02ck4321',
      organizationId: 'org_demo_1',
      ownerId: 'prof_owner_1',
      securePublicId: 'pub_mh02ck4321_y88b',
      registrationNumber: 'MH 02 CK 4321',
      normalizedRegNumber: 'MH02CK4321',
      vehicleType: 'CAR',
      make: 'Hyundai',
      model: 'Creta 1.5',
      manufacturingYear: 2024,
      fuelType: 'PETROL',
      mileageKmpl: 14,
      initialOdometer: 34200,
      currentOdometer: 34850,
      lastVerifiedOdometer: 34850,
      estimatedCurrentOdometer: 34850,
      ratePerKmRupees: 20,
      ownerUpiId: 'vehicleowner@upi',
      requiresApproval: false,
      state: 'Maharashtra',
      city: 'Mumbai',
      status: 'AVAILABLE',
      notes: 'Family SUV for long trips.',
      createdAt: '2026-08-05T09:00:00Z',
      updatedAt: new Date().toISOString(),
    }
  ],
  odometerHistory: [
    {
      id: 'odo_0',
      vehicleId: 'v_kl08ab1234',
      previousReading: 42000,
      newReading: 42580,
      difference: 580,
      updatedByName: 'Owner Physical Verification',
      reason: 'OWNER_VERIFIED',
      notes: 'Verified physical odometer reading',
      timestamp: '2026-08-14T08:00:00Z',
    },
    {
      id: 'odo_1',
      vehicleId: 'v_kl16p78',
      previousReading: 12500,
      newReading: 12500,
      difference: 0,
      updatedByName: 'Vehicle Registration',
      reason: 'MANUAL_UPDATE',
      notes: 'Initial registration entry',
      timestamp: '2026-08-01T08:00:00Z',
    },
    {
      id: 'odo_2',
      vehicleId: 'v_kl16p78',
      previousReading: 12500,
      newReading: 12560,
      difference: 60,
      updatedByName: 'Rahul Nair (Customer)',
      reason: 'RIDE_COMPLETED',
      rideId: 'ride_101',
      notes: 'City trip commute',
      timestamp: new Date().toISOString(),
    }
  ],
  rides: [],
  rentalTrips: [],
  invoices: [
    {
      id: 'inv_101',
      organizationId: 'org_demo_1',
      rideId: 'ride_101',
      vehicleId: 'v_kl16p78',
      vehicleRegNumber: 'KL 16 P 78',
      vehicleMakeModel: 'Royal Enfield Classic 350',
      invoiceNumber: 'INV-20260814-001',
      title: 'USAGE BILL',
      customerName: 'Rahul Nair',
      customerPhone: '+91 94000 11223',
      startOdometer: 12500,
      endOdometer: 12508,
      distanceKm: 8,
      mileageKmpl: 40,
      priceSnapshot: DEFAULT_SNAPSHOT,
      estimatedFuelLitres: 0.20,
      estimatedFuelCostRupees: 20.84,
      pricingMode: 'FUEL_COST',
      subtotalRupees: 20.84,
      taxRupees: 0.00,
      totalRupees: 20.84,
      payeeUpiId: 'owner@upi',
      payeeName: 'Vehicle Owner',
      upiDeepLink: 'upi://pay?pa=owner@upi&pn=Vehicle%20Owner&am=20.84&cu=INR&tr=INV-20260814-001',
      paymentStatus: 'PAID',
      paymentMethod: 'UPI_INTENT',
      paymentReference: 'UPI_TXN_98721',
      issuedAt: new Date().toISOString(),
      paidAt: new Date().toISOString(),
      notes: '8 km test journey at ₹104.20/L petrol price',
    }
  ],
  maintenanceRecords: [
    {
      id: 'maint_1',
      vehicleId: 'v_kl16p78',
      serviceType: 'ENGINE_OIL',
      serviceDate: '2026-07-20',
      odometerReading: 12000,
      costRupees: 1500,
      notes: 'Full synthetic 15W50 engine oil replacement and filter change',
      nextDueOdometer: 15000,
      createdAt: '2026-07-20T10:00:00Z',
    },
    {
      id: 'maint_2',
      vehicleId: 'v_kl08ab1234',
      serviceType: 'GENERAL_SERVICE',
      serviceDate: '2026-08-05',
      odometerReading: 40000,
      costRupees: 1200,
      notes: 'Brake pads and CVT belt inspection',
      nextDueOdometer: 45000,
      createdAt: '2026-08-05T10:00:00Z',
    }
  ],
  issues: [],
  adConfigurations: [
    {
      id: 'ad_dash',
      placement: 'dashboard-bottom',
      enabled: true,
      provider: 'Veylo Ads Engine',
      premiumExcluded: true,
      bannerTitle: 'Vehicle Insurance & RSA',
      bannerText: 'Save up to 40% on comprehensive two-wheeler and four-wheeler insurance.',
      bannerUrl: '#',
    },
    {
      id: 'ad_veh',
      placement: 'vehicle-bottom',
      enabled: true,
      provider: 'Veylo Ads Engine',
      premiumExcluded: true,
      bannerTitle: 'Doorstep Battery & Tyre Care',
      bannerText: 'Get verified doorstep battery health check and genuine tyres in Kozhikode.',
      bannerUrl: '#',
    }
  ],
  featureFlags: {
    onlinePayment: true,
    marketplaceSettlement: false,
    commission: false,
    gst: false,
    advertising: true,
    subscriptions: true,
    aiInsights: true,
    maintenance: true,
    gpsTracking: true,
  },
  riders: [],
  disputes: [],
  fuelPrices: [
    {
      id: 'fp_init_petrol',
      country: 'India',
      state: 'Kerala',
      city: 'Kozhikode',
      fuelType: 'PETROL',
      pricePerUnitPaise: 10420,
      priceRupees: 104.20,
      unit: 'LITRE',
      currency: 'INR',
      sourceName: 'MANUAL',
      effectiveDate: '2026-08-15',
      fetchedAt: new Date().toISOString(),
      status: 'LIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'MANUAL',
      effectiveAt: new Date().toISOString()
    },
    {
      id: 'fp_init_diesel',
      country: 'India',
      state: 'Kerala',
      city: 'Kozhikode',
      fuelType: 'DIESEL',
      pricePerUnitPaise: 9250,
      priceRupees: 92.50,
      unit: 'LITRE',
      currency: 'INR',
      sourceName: 'MANUAL',
      effectiveDate: '2026-08-15',
      fetchedAt: new Date().toISOString(),
      status: 'LIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'MANUAL',
      effectiveAt: new Date().toISOString()
    },
    {
      id: 'fp_init_cng',
      country: 'India',
      state: 'Kerala',
      city: 'Kozhikode',
      fuelType: 'CNG',
      pricePerUnitPaise: 8500,
      priceRupees: 85.00,
      unit: 'KG',
      currency: 'INR',
      sourceName: 'MANUAL',
      effectiveDate: '2026-08-15',
      fetchedAt: new Date().toISOString(),
      status: 'LIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'MANUAL',
      effectiveAt: new Date().toISOString()
    }
  ],
  fuelPriceHistory: [
    {
      id: 'h_init_petrol',
      fuelPriceId: 'fp_init_petrol',
      fuelType: 'PETROL',
      country: 'India',
      state: 'Kerala',
      city: 'Kozhikode',
      priceRupees: 104.20,
      pricePerUnitPaise: 10420,
      unit: 'LITRE',
      currency: 'INR',
      sourceName: 'MANUAL',
      effectiveDate: '2026-08-15',
      recordedAt: new Date().toISOString()
    }
  ],
  fuelPriceAuditLogs: [],
  paymentAttempts: []
};

class MockStorageService {
  private getStore(): AppState {
    if (typeof window === 'undefined') {
      return INITIAL_STATE;
    }
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (!serialized) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_STATE));
        return INITIAL_STATE;
      }
      const parsed = JSON.parse(serialized) as AppState;
      // Migrate: patch missing fields added in schema updates
      if (!parsed.riders) parsed.riders = [];
      if (!parsed.disputes) parsed.disputes = [];
      if (!parsed.rentalTrips) parsed.rentalTrips = [];
      if (!parsed.fuelPrices || parsed.fuelPrices.length === 0) {
        parsed.fuelPrices = INITIAL_STATE.fuelPrices;
      }
      if (!parsed.fuelPriceHistory) {
        parsed.fuelPriceHistory = INITIAL_STATE.fuelPriceHistory;
      }
      if (!parsed.fuelPriceAuditLogs) {
        parsed.fuelPriceAuditLogs = [];
      }
      if (!parsed.paymentAttempts) {
        parsed.paymentAttempts = [];
      }
      if (parsed.organization && !parsed.organization.upiStatus) {
        parsed.organization.upiStatus = parsed.organization.upiId ? 'ACTIVE' : 'NOT_CONFIGURED';
      }
      return parsed;
    } catch {
      return INITIAL_STATE;
    }
  }




  private saveStore(state: AppState) {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (err) {
        console.error('Failed to save to localStorage', err);
      }
    }
  }

  getState(): AppState {
    return this.getStore();
  }

  resetStore() {
    this.saveStore(INITIAL_STATE);
  }

  setTier(tier: PlanTier) {
    const store = this.getStore();
    store.currentTier = tier;
    store.organization.planTier = tier;
    this.saveStore(store);
  }

  getVehicles(): Vehicle[] {
    return this.getStore().vehicles;
  }

  getVehicleById(idOrPublicId: string): Vehicle | undefined {
    const store = this.getStore();
    return store.vehicles.find(
      (v) => v.id === idOrPublicId || v.securePublicId === idOrPublicId
    );
  }

  findVehicleByRegNumber(reg: string): Vehicle | undefined {
    const store = this.getStore();
    const normalized = normalizeRegistrationNumber(reg);
    return store.vehicles.find(
      (v) => v.normalizedRegNumber === normalized || v.registrationNumber.toLowerCase().replace(/\s+/g, '') === normalized.toLowerCase()
    );
  }

  addVehicle(vehicleData: Omit<Vehicle, 'id' | 'securePublicId' | 'normalizedRegNumber' | 'currentOdometer' | 'lastVerifiedOdometer' | 'estimatedCurrentOdometer' | 'status' | 'createdAt' | 'updatedAt'>): Vehicle {
    const store = this.getStore();
    const normalized = normalizeRegistrationNumber(vehicleData.registrationNumber);
    const id = `v_${normalized.toLowerCase()}_${Date.now()}`;
    const securePublicId = `pub_${normalized.toLowerCase()}_${Math.random().toString(36).substring(2, 6)}`;

    const newVehicle: Vehicle = {
      ...vehicleData,
      id,
      securePublicId,
      normalizedRegNumber: normalized,
      currentOdometer: vehicleData.initialOdometer,
      lastVerifiedOdometer: vehicleData.initialOdometer,
      estimatedCurrentOdometer: vehicleData.initialOdometer,
      ratePerKmRupees: vehicleData.ratePerKmRupees || 12,
      ownerUpiId: vehicleData.ownerUpiId || store.organization.upiId || 'vehicleowner@upi',
      requiresApproval: vehicleData.requiresApproval || false,
      status: 'AVAILABLE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.vehicles.push(newVehicle);

    // Initial odometer record
    store.odometerHistory.unshift({
      id: `odo_${Date.now()}`,
      vehicleId: id,
      previousReading: vehicleData.initialOdometer,
      newReading: vehicleData.initialOdometer,
      difference: 0,
      updatedByName: 'Vehicle Registration',
      reason: 'MANUAL_UPDATE',
      notes: 'Initial registration entry',
      timestamp: new Date().toISOString(),
    });

    this.saveStore(store);
    return newVehicle;
  }

  updateVehicleStatus(vehicleId: string, status: VehicleStatus) {
    const store = this.getStore();
    const vehicle = store.vehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      vehicle.status = status;
      vehicle.updatedAt = new Date().toISOString();
      this.saveStore(store);
    }
  }

  updateVehicleOdometer(
    vehicleId: string,
    newReading: number,
    reason: 'RIDE_COMPLETED' | 'GPS_RIDE_COMPLETED' | 'MANUAL_UPDATE' | 'ADMIN_CORRECTION' | 'OWNER_VERIFIED' = 'GPS_RIDE_COMPLETED',
    tripId?: string,
    notes?: string
  ) {
    const store = this.getStore();
    const vehicle = store.vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;

    const prev = vehicle.currentOdometer;
    vehicle.currentOdometer = newReading;
    vehicle.estimatedCurrentOdometer = newReading;
    if (reason === 'OWNER_VERIFIED' || reason === 'MANUAL_UPDATE') {
      vehicle.lastVerifiedOdometer = newReading;
    }
    vehicle.updatedAt = new Date().toISOString();

    store.odometerHistory.unshift({
      id: `odo_${Date.now()}`,
      vehicleId,
      previousReading: prev,
      newReading,
      difference: Math.round((newReading - prev) * 100) / 100,
      reason,
      tripId,
      notes: notes || (reason === 'GPS_RIDE_COMPLETED' ? 'Automatic GPS tracking update' : 'Odometer verified by owner'),
      timestamp: new Date().toISOString(),
    });

    this.saveStore(store);
  }

  recordRide(params: {
    vehicleId: string;
    customerName: string;
    customerPhone?: string;
    endOdometer: number;
    fuelPriceRupees: number;
    pricingMode?: PricingMode;
    perKmRateRupees?: number;
    additionalChargesRupees?: number;
    notes?: string;
  }): { ride: Ride; invoice: Invoice } {
    const store = this.getStore();
    const vehicle = store.vehicles.find((v) => v.id === params.vehicleId);
    if (!vehicle) throw new Error('Vehicle not found');

    const startOdometer = vehicle.currentOdometer;
    const fuelPricePaise = Math.round(params.fuelPriceRupees * 100);

    const calc = calculateRideCosts({
      startOdometer,
      endOdometer: params.endOdometer,
      mileageKmpl: vehicle.mileageKmpl,
      fuelPricePaise,
      pricingMode: params.pricingMode || 'FUEL_COST',
      perKmRateRupees: params.perKmRateRupees,
      additionalChargesRupees: params.additionalChargesRupees,
    });

    const now = new Date().toISOString();
    const rideId = `ride_${Date.now()}`;
    const invoiceId = `inv_${Date.now()}`;
    const invoiceNum = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(store.invoices.length + 1).padStart(3, '0')}`;

    const priceSnapshot: FuelPriceSnapshot = {
      snapshotId: `snap_${Date.now()}`,
      fuelType: vehicle.fuelType,
      country: 'India',
      state: vehicle.state || store.organization.defaultState || 'Kerala',
      city: vehicle.city || store.organization.defaultCity || 'Kozhikode',
      pricePerLitreRupees: params.fuelPriceRupees,
      priceRupees: params.fuelPriceRupees,
      pricePerUnitPaise: fuelPricePaise,
      unit: vehicle.fuelType === 'CNG' ? 'KG' : 'LITRE',
      currency: 'INR',
      source: 'Indian API (fuel.indianapi.in)',
      effectiveAt: now,
      fetchedAt: now,
      status: 'verified',
    };


    const newRide: Ride = {
      id: rideId,
      vehicleId: vehicle.id,
      organizationId: store.organization.id,
      ownerId: vehicle.ownerId,
      customerName: params.customerName,
      customerPhone: params.customerPhone,
      startOdometer,
      endOdometer: params.endOdometer,
      distanceKm: calc.distanceKm,
      fuelType: vehicle.fuelType,
      mileageKmpl: vehicle.mileageKmpl,
      priceSnapshot,
      estimatedFuelLitres: calc.estimatedFuelLitres,
      estimatedFuelCostPaise: calc.estimatedFuelCostPaise,
      pricePerKmPaise: calc.pricePerKmPaise,
      pricingMode: params.pricingMode || 'FUEL_COST',
      perKmRateRupees: params.perKmRateRupees,
      additionalChargesRupees: params.additionalChargesRupees,
      totalAmountPaise: calc.totalAmountPaise,
      totalAmountRupees: calc.totalAmountRupees,
      notes: params.notes,
      issueReported: false,
      status: 'COMPLETED',
      createdAt: now,
      completedAt: now,
    };

    const payeeUpi = vehicle.ownerUpiId || store.organization.upiId || 'vehicleowner@upi';
    const payeeName = store.organization.upiPayeeName || 'Vehicle Owner';

    const upiLink = generateUpiDeepLink({
      payeeUpiId: payeeUpi,
      payeeName,
      amountRupees: calc.totalAmountRupees,
      transactionNote: `Ride ${vehicle.registrationNumber} (${calc.distanceKm} km)`,
      referenceId: invoiceNum,
    });

    const newInvoice: Invoice = {
      id: invoiceId,
      organizationId: store.organization.id,
      rideId,
      vehicleId: vehicle.id,
      vehicleRegNumber: vehicle.registrationNumber,
      vehicleMakeModel: `${vehicle.make} ${vehicle.model}`,
      invoiceNumber: invoiceNum,
      title: 'USAGE BILL',
      customerName: params.customerName,
      customerPhone: params.customerPhone,
      startOdometer,
      endOdometer: params.endOdometer,
      distanceKm: calc.distanceKm,
      mileageKmpl: vehicle.mileageKmpl,
      priceSnapshot,
      estimatedFuelLitres: calc.estimatedFuelLitres,
      estimatedFuelCostRupees: calc.estimatedFuelCostRupees,
      pricingMode: params.pricingMode || 'FUEL_COST',
      perKmRateRupees: params.perKmRateRupees,
      additionalChargesRupees: params.additionalChargesRupees,
      subtotalRupees: calc.totalAmountRupees,
      taxRupees: 0.00,
      totalRupees: calc.totalAmountRupees,
      payeeUpiId: payeeUpi,
      payeeName,
      upiDeepLink: upiLink,
      paymentStatus: 'PENDING',
      issuedAt: now,
      notes: params.notes,
    };

    vehicle.currentOdometer = params.endOdometer;
    vehicle.estimatedCurrentOdometer = params.endOdometer;
    vehicle.updatedAt = now;

    store.odometerHistory.unshift({
      id: `odo_${Date.now()}`,
      vehicleId: vehicle.id,
      previousReading: startOdometer,
      newReading: params.endOdometer,
      difference: calc.distanceKm,
      updatedByName: params.customerName || 'Customer Usage',
      reason: 'RIDE_COMPLETED',
      rideId,
      timestamp: now,
    });

    store.rides.unshift(newRide);
    store.invoices.unshift(newInvoice);

    this.saveStore(store);
    return { ride: newRide, invoice: newInvoice };
  }

  // --- RENTAL TRIPS ---
  addRentalTrip(trip: RentalTrip) {
    const store = this.getStore();
    if (!store.rentalTrips) store.rentalTrips = [];
    store.rentalTrips.unshift(trip);
    this.saveStore(store);
  }

  updateRentalTrip(trip: RentalTrip) {
    const store = this.getStore();
    if (!store.rentalTrips) store.rentalTrips = [];
    const idx = store.rentalTrips.findIndex(t => t.id === trip.id);
    if (idx !== -1) {
      store.rentalTrips[idx] = trip;
    } else {
      store.rentalTrips.unshift(trip);
    }
    this.saveStore(store);
  }

  getRentalTripById(tripId: string): RentalTrip | undefined {
    const store = this.getStore();
    return store.rentalTrips?.find(t => t.id === tripId);
  }

  getRentalTrips(): RentalTrip[] {
    const store = this.getStore();
    return store.rentalTrips || [];
  }

  getActiveRentalTrips(): RentalTrip[] {
    const store = this.getStore();
    return (store.rentalTrips || []).filter(t => t.status === 'ACTIVE' || t.status === 'CONFIRMATION_PENDING');
  }

  // --- INVOICES ---
  addInvoice(invoice: Invoice) {
    const store = this.getStore();
    store.invoices.unshift(invoice);
    this.saveStore(store);
  }

  updateInvoice(invoice: Invoice) {
    const store = this.getStore();
    const idx = store.invoices.findIndex(i => i.id === invoice.id);
    if (idx !== -1) {
      store.invoices[idx] = invoice;
    } else {
      store.invoices.unshift(invoice);
    }
    this.saveStore(store);
  }


  updateInvoicePaymentStatus(invoiceId: string, status: PaymentStatus, method = 'UPI_INTENT', ref?: string): Invoice {
    const store = this.getStore();
    const invoice = store.invoices.find(i => i.id === invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    invoice.paymentStatus = status;
    invoice.paymentMethod = method;
    if (ref) invoice.paymentReference = ref;
    if (status === 'PAID') invoice.paidAt = new Date().toISOString();

    this.saveStore(store);
    return invoice;
  }

  updateOwnerUpiSettings(upiId: string, payeeName: string, enabled = true, status: UpiStatus = 'CONFIGURED') {
    const store = this.getStore();
    store.organization.upiId = upiId;
    store.organization.upiPayeeName = payeeName;
    store.organization.upiEnabled = enabled;
    store.organization.upiStatus = status;
    store.organization.upiUpdatedAt = new Date().toISOString();
    if (status === 'ACTIVE') {
      store.organization.upiVerifiedAt = new Date().toISOString();
    }
    this.saveStore(store);
  }


  addMaintenanceRecord(rec: Omit<MaintenanceRecord, 'id' | 'createdAt'>): MaintenanceRecord {
    const store = this.getStore();
    const newRec: MaintenanceRecord = {
      ...rec,
      id: `maint_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    store.maintenanceRecords.unshift(newRec);
    this.saveStore(store);
    return newRec;
  }

  addIssue(issue: Omit<Issue, 'id' | 'createdAt' | 'status'>): Issue {
    const store = this.getStore();
    const newIssue: Issue = {
      ...issue,
      id: `issue_${Date.now()}`,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
    };
    store.issues.unshift(newIssue);
    this.saveStore(store);
    return newIssue;
  }

  updateFeatureFlags(flags: Partial<FeatureFlags>) {
    const store = this.getStore();
    store.featureFlags = { ...store.featureFlags, ...flags };
    this.saveStore(store);
  }

  // --- RIDER PROFILES ---
  getRiders(): RiderProfile[] {
    return this.getStore().riders || [];
  }

  getRiderById(riderId: string): RiderProfile | undefined {
    return this.getRiders().find(r => r.id === riderId);
  }

  getRiderByPhone(phone: string): RiderProfile | undefined {
    const normalized = phone.replace(/\D/g, '');
    return this.getRiders().find(r => r.phone.replace(/\D/g, '') === normalized);
  }

  upsertRider(rider: RiderProfile): RiderProfile {
    const store = this.getStore();
    if (!store.riders) store.riders = [];
    const idx = store.riders.findIndex(r => r.id === rider.id);
    if (idx !== -1) {
      store.riders[idx] = rider;
    } else {
      store.riders.unshift(rider);
    }
    this.saveStore(store);
    return rider;
  }

  // --- DISPUTES ---
  getDisputes(): Dispute[] {
    return this.getStore().disputes || [];
  }

  getDisputeByTripId(tripId: string): Dispute | undefined {
    return this.getDisputes().find(d => d.tripId === tripId);
  }

  addDispute(dispute: Omit<Dispute, 'id' | 'createdAt' | 'updatedAt'>): Dispute {
    const store = this.getStore();
    if (!store.disputes) store.disputes = [];
    const newDispute: Dispute = {
      ...dispute,
      id: `dispute_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.disputes.unshift(newDispute);
    this.saveStore(store);
    return newDispute;
  }

  updateDispute(disputeId: string, updates: Partial<Pick<Dispute, 'status' | 'resolution'>>): Dispute | undefined {
    const store = this.getStore();
    if (!store.disputes) store.disputes = [];
    const dispute = store.disputes.find(d => d.id === disputeId);
    if (!dispute) return undefined;
    Object.assign(dispute, { ...updates, updatedAt: new Date().toISOString() });
    this.saveStore(store);
    return dispute;
  }

  // --- TODAY / MONTH EARNINGS HELPERS ---
  getTodayEarnings(): number {
    const today = new Date().toISOString().slice(0, 10);
    return this.getStore().invoices
      .filter(i => i.paymentStatus === 'PAID' && i.issuedAt?.startsWith(today))
      .reduce((sum, i) => sum + i.totalRupees, 0);
  }

  getThisMonthEarnings(): number {
    const month = new Date().toISOString().slice(0, 7);
    return this.getStore().invoices
      .filter(i => i.paymentStatus === 'PAID' && i.issuedAt?.startsWith(month))
      .reduce((sum, i) => sum + i.totalRupees, 0);
  }

  // --- FUEL PRICES CRUD ---
  getFuelPrices(): FuelPrice[] {
    return this.getStore().fuelPrices || [];
  }

  getFuelPrice(fuelType: FuelType, state: string = 'Kerala', city: string = 'Kozhikode'): FuelPrice | undefined {
    return this.getFuelPrices().find(
      fp => fp.fuelType === fuelType &&
            fp.state.toLowerCase() === state.toLowerCase() &&
            fp.city.toLowerCase() === city.toLowerCase()
    );
  }

  saveFuelPrice(fuelPrice: FuelPrice): FuelPrice {
    const store = this.getStore();
    if (!store.fuelPrices) store.fuelPrices = [];
    const idx = store.fuelPrices.findIndex(
      fp => fp.fuelType === fuelPrice.fuelType &&
            fp.state.toLowerCase() === fuelPrice.state.toLowerCase() &&
            fp.city.toLowerCase() === fuelPrice.city.toLowerCase()
    );

    const now = new Date().toISOString();
    const updatedPrice = {
      ...fuelPrice,
      // Ensure compatibility fields are present
      source: fuelPrice.sourceName,
      effectiveAt: fuelPrice.effectiveDate + 'T06:00:00Z',
      createdAt: idx !== -1 ? store.fuelPrices[idx].createdAt : now,
      updatedAt: now
    };

    if (idx !== -1) {
      store.fuelPrices[idx] = updatedPrice;
    } else {
      store.fuelPrices.push(updatedPrice);
    }

    this.saveStore(store);
    return updatedPrice;
  }

  getFuelPriceHistory(): FuelPriceHistoryItem[] {
    return this.getStore().fuelPriceHistory || [];
  }

  addFuelPriceHistoryItem(item: Omit<FuelPriceHistoryItem, 'id' | 'recordedAt'>): FuelPriceHistoryItem {
    const store = this.getStore();
    if (!store.fuelPriceHistory) store.fuelPriceHistory = [];
    const newItem: FuelPriceHistoryItem = {
      ...item,
      id: `h_${Date.now()}`,
      recordedAt: new Date().toISOString()
    };
    store.fuelPriceHistory.unshift(newItem);
    this.saveStore(store);
    return newItem;
  }

  getFuelPriceAuditLogs(): FuelPriceAuditLog[] {
    return this.getStore().fuelPriceAuditLogs || [];
  }

  addFuelPriceAuditLog(log: Omit<FuelPriceAuditLog, 'id' | 'createdAt'>): FuelPriceAuditLog {
    const store = this.getStore();
    if (!store.fuelPriceAuditLogs) store.fuelPriceAuditLogs = [];
    const newLog: FuelPriceAuditLog = {
      ...log,
      id: `audit_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    store.fuelPriceAuditLogs.unshift(newLog);
    this.saveStore(store);
    return newLog;
  }

  // --- PAYMENT ATTEMPTS CRUD ---
  getPaymentAttempts(): PaymentAttempt[] {
    return this.getStore().paymentAttempts || [];
  }

  getPaymentAttemptsByInvoiceId(invoiceId: string): PaymentAttempt[] {
    return this.getPaymentAttempts().filter(pa => pa.invoiceId === invoiceId);
  }

  addPaymentAttempt(attempt: Omit<PaymentAttempt, 'paymentId' | 'createdAt' | 'updatedAt'>): PaymentAttempt {
    const store = this.getStore();
    if (!store.paymentAttempts) store.paymentAttempts = [];
    
    const newAttempt: PaymentAttempt = {
      ...attempt,
      paymentId: `pay_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    store.paymentAttempts.unshift(newAttempt);
    this.saveStore(store);
    return newAttempt;
  }

  updatePaymentAttempt(paymentId: string, status: PaymentStatus | 'PAYMENT_PROCESSING' | 'REFUNDED', ref?: string): PaymentAttempt | undefined {
    const store = this.getStore();
    if (!store.paymentAttempts) store.paymentAttempts = [];
    
    const attempt = store.paymentAttempts.find(pa => pa.paymentId === paymentId);
    if (!attempt) return undefined;
    
    attempt.status = status;
    attempt.updatedAt = new Date().toISOString();
    if (ref) attempt.providerReference = ref;
    if (status === 'PAID') {
      attempt.paidAt = new Date().toISOString();
    }
    
    this.saveStore(store);
    return attempt;
  }
}


export const mockStorage = new MockStorageService();

