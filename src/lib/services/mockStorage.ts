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
  PaymentStatus
} from '@/types';
import { normalizeRegistrationNumber } from './registrationNormalizer';
import { calculateRideCosts, generateUpiDeepLink } from './financialEngine';
import { fuelPriceService } from './fuelPriceProvider';

const STORAGE_KEY = 'vbs_saas_store_v1';

export interface AppState {
  currentTier: PlanTier;
  organization: Organization;
  vehicles: Vehicle[];
  odometerHistory: OdometerRecord[];
  rides: Ride[];
  invoices: Invoice[];
  maintenanceRecords: MaintenanceRecord[];
  issues: Issue[];
  adConfigurations: AdConfiguration[];
  featureFlags: FeatureFlags;
}

const DEFAULT_SNAPSHOT: FuelPriceSnapshot = {
  snapshotId: 'snap_init_10420',
  fuelType: 'PETROL',
  country: 'India',
  state: 'Kerala',
  city: 'Kozhikode',
  pricePerLitreRupees: 104.20,
  pricePerUnitPaise: 10420,
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
    name: 'Apex Fleet Solutions',
    slug: 'apex-fleet',
    planTier: 'FREE',
    businessName: 'Apex Vehicle Billing',
    email: 'owner@speeedfleet.com',
    phone: '+91 98765 43210',
    defaultState: 'Kerala',
    defaultCity: 'Kozhikode',
    upiId: 'owner@upi',
    upiPayeeName: 'Vehicle Owner',
    upiEnabled: true,
    taxEnabled: false,
    cgstRate: 0,
    sgstRate: 0,
    igstRate: 0,
    invoicePrefix: 'VBS',
    createdAt: new Date().toISOString(),
  },
  vehicles: [
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
      state: 'Kerala',
      city: 'Kozhikode',
      status: 'AVAILABLE',
      notes: 'Primary daily commute bike. Kozhikode location.',
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
  rides: [
    {
      id: 'ride_101',
      vehicleId: 'v_kl16p78',
      organizationId: 'org_demo_1',
      ownerId: 'prof_owner_1',
      customerName: 'Rahul Nair',
      customerPhone: '+91 94000 11223',
      startOdometer: 12500,
      endOdometer: 12560,
      distanceKm: 60,
      fuelType: 'PETROL',
      mileageKmpl: 40,
      priceSnapshot: DEFAULT_SNAPSHOT,
      estimatedFuelLitres: 1.50,
      estimatedFuelCostPaise: 15630,
      pricePerKmPaise: 260,
      pricingMode: 'FUEL_COST',
      totalAmountPaise: 15630,
      totalAmountRupees: 156.30,
      notes: 'Highway & city run',
      issueReported: false,
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    }
  ],
  invoices: [
    {
      id: 'inv_101',
      organizationId: 'org_demo_1',
      rideId: 'ride_101',
      vehicleId: 'v_kl16p78',
      vehicleRegNumber: 'KL 16 P 78',
      vehicleMakeModel: 'Royal Enfield Classic 350',
      invoiceNumber: 'VBS-2026-0001',
      title: 'USAGE BILL',
      customerName: 'Rahul Nair',
      customerPhone: '+91 94000 11223',
      startOdometer: 12500,
      endOdometer: 12560,
      distanceKm: 60,
      mileageKmpl: 40,
      priceSnapshot: DEFAULT_SNAPSHOT,
      estimatedFuelLitres: 1.50,
      estimatedFuelCostRupees: 156.30,
      pricingMode: 'FUEL_COST',
      subtotalRupees: 156.30,
      taxRupees: 0.00,
      totalRupees: 156.30,
      payeeUpiId: 'owner@upi',
      payeeName: 'Vehicle Owner',
      upiDeepLink: 'upi://pay?pa=owner%40upi&pn=Vehicle%20Owner&am=156.30&cu=INR&tr=VBS-2026-0001&tn=Usage%20Bill',
      paymentStatus: 'PAID',
      paymentMethod: 'UPI_INTENT',
      issuedAt: new Date().toISOString(),
      paidAt: new Date().toISOString(),
    }
  ],
  maintenanceRecords: [
    {
      id: 'maint_1',
      vehicleId: 'v_kl16p78',
      serviceType: 'ENGINE_OIL',
      serviceDate: '2026-07-20',
      odometerReading: 12000,
      costRupees: 1450,
      notes: 'Full synthetic oil change & oil filter replace',
      nextDueOdometer: 15000,
      nextDueDate: '2026-11-20',
      createdAt: '2026-07-20T10:00:00Z',
    }
  ],
  issues: [],
  adConfigurations: [
    {
      id: 'ad_dash',
      placement: 'dashboard-bottom',
      enabled: true,
      provider: 'Google AdSense (Mock)',
      premiumExcluded: true,
      bannerTitle: 'Save on Fleet Insurance & RSA',
      bannerText: 'Compare instant vehicle insurance quotes with zero commission.',
      bannerUrl: '#',
    },
    {
      id: 'ad_veh',
      placement: 'vehicle-bottom',
      enabled: true,
      provider: 'Google AdSense (Mock)',
      premiumExcluded: true,
      bannerTitle: 'Certified Tyre Replacement Stores',
      bannerText: 'Get 15% discount on Goodyear & Michelin tyres near your location.',
      bannerUrl: '#',
    },
    {
      id: 'ad_inv',
      placement: 'invoice-bottom',
      enabled: true,
      provider: 'Google AdSense (Mock)',
      premiumExcluded: true,
      bannerTitle: 'Automotive Care & Engine Health',
      bannerText: 'Keep your health score above 85% with verified service partners.',
      bannerUrl: '#',
    },
    {
      id: 'ad_pub',
      placement: 'public-page-bottom',
      enabled: true,
      provider: 'Google AdSense (Mock)',
      premiumExcluded: true,
      bannerTitle: 'Manage Your Own Vehicles Free',
      bannerText: 'Create a free Vehicle Bill account to track fuel expenses & bills.',
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
  }
};

export class MockStorageService {
  private getStore(): AppState {
    if (typeof window === 'undefined') return INITIAL_STATE;
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_STATE));
        return INITIAL_STATE;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_STATE;
    }
  }

  private saveStore(state: AppState) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Storage save error:', e);
    }
  }

  getState(): AppState {
    return this.getStore();
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

  getVehicleById(id: string): Vehicle | undefined {
    return this.getStore().vehicles.find(v => v.id === id || v.securePublicId === id);
  }

  addVehicle(rawVehicle: Omit<Vehicle, 'id' | 'securePublicId' | 'normalizedRegNumber' | 'currentOdometer' | 'status' | 'createdAt' | 'updatedAt'> & { initialOdometer: number; state?: string; city?: string }): Vehicle {
    const store = this.getStore();
    const normalized = normalizeRegistrationNumber(rawVehicle.registrationNumber);
    
    const newVehicle: Vehicle = {
      ...rawVehicle,
      id: `v_${Date.now()}`,
      organizationId: store.organization.id,
      ownerId: 'prof_owner_1',
      securePublicId: `pub_${normalized.toLowerCase()}_${Math.random().toString(36).substring(2, 6)}`,
      normalizedRegNumber: normalized,
      currentOdometer: rawVehicle.initialOdometer,
      state: rawVehicle.state || store.organization.defaultState || 'Kerala',
      city: rawVehicle.city || store.organization.defaultCity || 'Kozhikode',
      status: 'AVAILABLE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.vehicles.unshift(newVehicle);
    
    store.odometerHistory.unshift({
      id: `odo_init_${Date.now()}`,
      vehicleId: newVehicle.id,
      previousReading: rawVehicle.initialOdometer,
      newReading: rawVehicle.initialOdometer,
      difference: 0,
      updatedByName: 'Vehicle Registration',
      reason: 'MANUAL_UPDATE',
      notes: 'Initial vehicle registration',
      timestamp: new Date().toISOString(),
    });

    this.saveStore(store);
    return newVehicle;
  }

  recordRide(params: {
    vehicleId: string;
    customerName: string;
    customerPhone?: string;
    endOdometer: number;
    fuelPriceRupees: number;
    pricingMode?: PricingMode;
    perKmRateRupees?: number;
    fixedRateRupees?: number;
    additionalChargesRupees?: number;
    notes?: string;
  }): { ride: Ride; invoice: Invoice } {
    const store = this.getStore();
    const vehicle = store.vehicles.find(v => v.id === params.vehicleId);
    
    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    if (params.endOdometer < vehicle.currentOdometer) {
      throw new Error(`End odometer (${params.endOdometer} km) cannot be less than current odometer (${vehicle.currentOdometer} km).`);
    }

    const startOdometer = vehicle.currentOdometer;
    const fuelPricePaise = Math.round(params.fuelPriceRupees * 100);

    const priceSnapshot: FuelPriceSnapshot = {
      snapshotId: `snap_${Date.now()}`,
      fuelType: vehicle.fuelType,
      country: 'India',
      state: vehicle.state || 'Kerala',
      city: vehicle.city || 'Kozhikode',
      pricePerLitreRupees: params.fuelPriceRupees,
      pricePerUnitPaise: fuelPricePaise,
      currency: 'INR',
      source: 'Indian API (fuel.indianapi.in)',
      effectiveAt: new Date().toISOString(),
      fetchedAt: new Date().toISOString(),
      status: 'verified',
    };

    const calc = calculateRideCosts({
      startOdometer,
      endOdometer: params.endOdometer,
      mileageKmpl: vehicle.mileageKmpl,
      fuelPricePaise,
      pricingMode: params.pricingMode || 'FUEL_COST',
      perKmRateRupees: params.perKmRateRupees || 0,
      fixedRateRupees: params.fixedRateRupees || 0,
      additionalChargesRupees: params.additionalChargesRupees || 0,
    });

    const now = new Date().toISOString();
    const rideId = `ride_${Date.now()}`;
    const invoiceId = `inv_${Date.now()}`;
    const invoiceNum = `VBS-${new Date().getFullYear()}-${String(store.invoices.length + 1).padStart(4, '0')}`;

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
      fixedRateRupees: params.fixedRateRupees,
      additionalChargesRupees: params.additionalChargesRupees,
      totalAmountPaise: calc.totalAmountPaise,
      totalAmountRupees: calc.totalAmountRupees,
      notes: params.notes,
      issueReported: false,
      status: 'COMPLETED',
      createdAt: now,
      completedAt: now,
    };

    const payeeUpi = store.organization.upiId || 'owner@upi';
    const payeeName = store.organization.upiPayeeName || 'Vehicle Owner';

    const upiLink = generateUpiDeepLink({
      payeeUpiId: payeeUpi,
      payeeName,
      amountRupees: calc.totalAmountRupees,
      transactionRef: invoiceNum,
      invoiceId: invoiceNum,
      note: `Usage Bill ${invoiceNum} for ${vehicle.registrationNumber}`,
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

  updateOwnerUpiSettings(upiId: string, payeeName: string, enabled = true) {
    const store = this.getStore();
    store.organization.upiId = upiId;
    store.organization.upiPayeeName = payeeName;
    store.organization.upiEnabled = enabled;
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
}

export const mockStorage = new MockStorageService();
