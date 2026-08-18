import { PricingMode, FuelPriceSnapshot } from '@/types';

export interface RideCalculationParams {
  startOdometer: number;
  endOdometer: number;
  mileageKmpl: number;
  fuelPricePaise: number; // e.g. 10420 for ₹104.20
  pricingMode?: PricingMode;
  perKmRateRupees?: number;
  fixedRateRupees?: number;
  additionalChargesRupees?: number;
}

export interface RideCalculationResult {
  distanceKm: number;
  estimatedFuelLitres: number;
  estimatedFuelCostPaise: number;
  estimatedFuelCostRupees: number;
  pricePerKmPaise: number;
  pricePerKmRupees: number;
  costPer10KmRupees: number;
  costPer100KmRupees: number;
  totalAmountPaise: number;
  totalAmountRupees: number;
  formattedTotal: string;
}

export function calculateRideCosts(params: RideCalculationParams): RideCalculationResult {
  const { 
    startOdometer, 
    endOdometer, 
    mileageKmpl, 
    fuelPricePaise, 
    pricingMode = 'FUEL_COST', 
    perKmRateRupees = 0, 
    fixedRateRupees = 0,
    additionalChargesRupees = 0
  } = params;

  const safeStart = Math.max(0, Number(startOdometer || 0));
  const safeEnd = Math.max(safeStart, Number(endOdometer || 0));
  const safeMileage = Number(mileageKmpl) > 0 ? Number(mileageKmpl) : 1;

  const distanceKm = Math.round((safeEnd - safeStart) * 100) / 100;
  
  // Fuel consumed in Litres (e.g. 8 km / 40 km/L = 0.20 L)
  const estimatedFuelLitres = distanceKm > 0 ? Math.round((distanceKm / safeMileage) * 1000) / 1000 : 0;
  
  // Fuel cost in integer paise (e.g. (8 / 40) * 10420 = 2084 paise = ₹20.84)
  const estimatedFuelCostPaise = Math.round((distanceKm / safeMileage) * fuelPricePaise);
  
  // Price per kilometre in paise
  const pricePerKmPaise = distanceKm > 0 
    ? Math.round(estimatedFuelCostPaise / distanceKm) 
    : Math.round((1 / safeMileage) * fuelPricePaise);

  const perKmRatePaise = Math.round(perKmRateRupees * 100);
  const fixedRatePaise = Math.round(fixedRateRupees * 100);
  const additionalPaise = Math.round(additionalChargesRupees * 100);

  let totalAmountPaise = 0;
  
  switch (pricingMode) {
    case 'PER_KM':
      // e.g. 8 km * ₹3/km = ₹24.00
      totalAmountPaise = Math.round(distanceKm * perKmRatePaise) + additionalPaise;
      break;

    case 'FUEL_PLUS_PER_KM':
      // e.g. ₹20.84 fuel cost + (8 km * ₹1/km = ₹8.00) = ₹28.84
      totalAmountPaise = estimatedFuelCostPaise + Math.round(distanceKm * perKmRatePaise) + additionalPaise;
      break;

    case 'FIXED':
      totalAmountPaise = fixedRatePaise + additionalPaise;
      break;

    case 'CUSTOM':
      totalAmountPaise = fixedRatePaise > 0 ? fixedRatePaise : estimatedFuelCostPaise;
      break;

    case 'FUEL_COST':
    default:
      // e.g. ₹20.84
      totalAmountPaise = estimatedFuelCostPaise + additionalPaise;
      break;
  }

  const estimatedFuelCostRupees = estimatedFuelCostPaise / 100;
  const pricePerKmRupees = pricePerKmPaise / 100;
  const totalAmountRupees = totalAmountPaise / 100;

  return {
    distanceKm,
    estimatedFuelLitres,
    estimatedFuelCostPaise,
    estimatedFuelCostRupees,
    pricePerKmPaise,
    pricePerKmRupees,
    costPer10KmRupees: Math.round(pricePerKmRupees * 10 * 100) / 100,
    costPer100KmRupees: Math.round(pricePerKmRupees * 100 * 100) / 100,
    totalAmountPaise,
    totalAmountRupees,
    formattedTotal: formatCurrency(totalAmountRupees),
  };
}

export function formatCurrency(amountRupees: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amountRupees);
}

/**
 * Generates standard UPI Payment Intent URI (`upi://pay`)
 */
export function generateUpiDeepLink(params: {
  payeeUpiId: string;
  payeeName: string;
  amountRupees: number;
  transactionRef?: string;
  referenceId?: string;
  invoiceId?: string;
  note?: string;
  transactionNote?: string;
}): string {
  const { payeeUpiId, payeeName, amountRupees } = params;
  const ref = params.transactionRef || params.referenceId || `TXN_${Date.now()}`;
  const note = params.transactionNote || params.note || `Usage Bill Payment ${params.invoiceId || ref}`;

  const encUpi = encodeURIComponent(payeeUpiId.trim());
  const encName = encodeURIComponent(payeeName.trim() || 'Vehicle Owner');
  const formattedAmt = amountRupees.toFixed(2);
  const encNote = encodeURIComponent(note);
  const encRef = encodeURIComponent(ref);

  return `upi://pay?pa=${encUpi}&pn=${encName}&am=${formattedAmt}&cu=INR&tr=${encRef}&tn=${encNote}`;
}
