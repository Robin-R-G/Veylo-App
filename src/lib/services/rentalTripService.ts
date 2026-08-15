import { RentalTrip, GPSPoint, TripStatus, Invoice, Vehicle, FuelPriceSnapshot } from '@/types';
import { mockStorage } from './mockStorage';
import { filterAndValidateGpsPoint } from './gpsTrackingEngine';
import { generateUpiDeepLink } from './financialEngine';
import { authService } from './authService';
import { fuelPriceService } from './fuelPriceService';

export class RentalTripService {
  /**
   * Starts a new rental trip for a rider on a verified vehicle.
   */
  startTrip(params: {
    vehicleId: string;
    riderName: string;
    riderPhone: string;
    startCoordinates?: { lat: number; lng: number };
  }): RentalTrip {
    const vehicle = mockStorage.getVehicleById(params.vehicleId);
    if (!vehicle) {
      throw new Error('Vehicle not found.');
    }

    if (vehicle.status !== 'AVAILABLE') {
      throw new Error(`Vehicle is currently ${vehicle.status}. Only available vehicles can be rented.`);
    }

    // Use auth session if available, otherwise use provided params
    const session = authService.getSession();
    const riderId = session?.userId || `rider_${Date.now()}`;
    const riderName = (session?.name || params.riderName).trim() || 'Rider';
    const riderPhone = (session?.phone || params.riderPhone).trim() || '+91 94000 11223';

    const state = mockStorage.getState();
    const tripId = `TRIP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(state.rentalTrips?.length ? state.rentalTrips.length + 1 : 1).padStart(3, '0')}`;
    
    const initialPoint: GPSPoint | undefined = params.startCoordinates
      ? {
          latitude: params.startCoordinates.lat,
          longitude: params.startCoordinates.lng,
          accuracy: 10,
          timestamp: Date.now(),
        }
      : undefined;

    const newTrip: RentalTrip = {
      id: tripId,
      vehicleId: vehicle.id,
      vehicleRegNumber: vehicle.registrationNumber,
      vehicleModel: `${vehicle.make} ${vehicle.model}`,
      vehicleType: vehicle.vehicleType,
      ownerId: vehicle.ownerId,
      ownerName: 'Robin (Owner)',
      ownerUpiId: vehicle.ownerUpiId || state.organization.upiId || 'vehicleowner@upi',
      riderId,
      riderName,
      riderPhone,
      
      startTime: new Date().toISOString(),
      durationSeconds: 0,

      startOdometer: vehicle.currentOdometer,
      gpsDistanceKm: 0,
      estimatedEndOdometer: vehicle.currentOdometer,

      ratePerKmRupees: vehicle.ratePerKmRupees || 12,
      distanceChargeRupees: 0,
      otherChargesRupees: 0,
      totalAmountRupees: 0,

      status: 'ACTIVE',
      gpsTrackingStatus: 'ACTIVE',
      isSuspicious: false,

      startCoordinates: params.startCoordinates,
      currentCoordinates: params.startCoordinates,
      trackingPoints: initialPoint ? [initialPoint] : [],

      paymentStatus: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Update state
    mockStorage.addRentalTrip(newTrip);

    // Update vehicle status to IN_USE
    mockStorage.updateVehicleStatus(vehicle.id, 'IN_USE');

    return newTrip;
  }

  /**
   * Ingests a new GPS reading during an active trip.
   */
  ingestGpsPoint(tripId: string, point: GPSPoint): RentalTrip {
    const trip = mockStorage.getRentalTripById(tripId);
    if (!trip) {
      throw new Error(`Trip ${tripId} not found.`);
    }

    if (trip.status !== 'ACTIVE') {
      return trip;
    }

    const lastAccepted = trip.trackingPoints.length > 0 ? trip.trackingPoints[trip.trackingPoints.length - 1] : null;
    const filterResult = filterAndValidateGpsPoint(lastAccepted, point);

    let updatedDistanceKm = trip.gpsDistanceKm;
    const updatedPoints = [...trip.trackingPoints];

    if (filterResult.accepted) {
      updatedDistanceKm = Math.round((trip.gpsDistanceKm + filterResult.distanceDeltaKm) * 100) / 100;
      updatedPoints.push({
        ...point,
        distanceFromLastPointKm: filterResult.distanceDeltaKm,
      });
    }

    const startTs = new Date(trip.startTime).getTime();
    const durationSec = Math.max(0, Math.floor((Date.now() - startTs) / 1000));
    const estimatedEndingKm = Math.round((trip.startOdometer + updatedDistanceKm) * 100) / 100;
    const distanceCharge = Math.round(updatedDistanceKm * trip.ratePerKmRupees * 100) / 100;
    const totalAmount = Math.round((distanceCharge + trip.otherChargesRupees) * 100) / 100;

    const updatedTrip: RentalTrip = {
      ...trip,
      gpsDistanceKm: updatedDistanceKm,
      estimatedEndOdometer: estimatedEndingKm,
      durationSeconds: durationSec,
      distanceChargeRupees: distanceCharge,
      totalAmountRupees: totalAmount,
      currentCoordinates: { lat: point.latitude, lng: point.longitude },
      trackingPoints: updatedPoints,
      isSuspicious: trip.isSuspicious || filterResult.isSuspicious,
      suspiciousReason: filterResult.suspiciousReason || trip.suspiciousReason,
      updatedAt: new Date().toISOString(),
    };

    mockStorage.updateRentalTrip(updatedTrip);
    return updatedTrip;
  }

  /**
   * Ends an active rental trip and transitions to CONFIRMATION_PENDING.
   */
  endTrip(tripId: string, manualDistanceOverrideKm?: number): RentalTrip {
    const trip = mockStorage.getRentalTripById(tripId);
    if (!trip) {
      throw new Error(`Trip ${tripId} not found.`);
    }

    const finalDistance = manualDistanceOverrideKm !== undefined ? manualDistanceOverrideKm : trip.gpsDistanceKm;
    const finalEndOdo = Math.round((trip.startOdometer + finalDistance) * 100) / 100;
    const distanceCharge = Math.round(finalDistance * trip.ratePerKmRupees * 100) / 100;
    const totalAmount = Math.round((distanceCharge + trip.otherChargesRupees) * 100) / 100;

    const startTs = new Date(trip.startTime).getTime();
    const durationSec = Math.max(0, Math.floor((Date.now() - startTs) / 1000));

    const updatedTrip: RentalTrip = {
      ...trip,
      endTime: new Date().toISOString(),
      durationSeconds: durationSec,
      gpsDistanceKm: finalDistance,
      estimatedEndOdometer: finalEndOdo,
      distanceChargeRupees: distanceCharge,
      totalAmountRupees: totalAmount,
      status: 'CONFIRMATION_PENDING',
      gpsTrackingStatus: 'STOPPED',
      updatedAt: new Date().toISOString(),
    };

    mockStorage.updateRentalTrip(updatedTrip);
    return updatedTrip;
  }

  /**
   * Confirms the trip, generates the invoice, creates UPI deep-link, and updates the vehicle digital mileage ledger.
   */
  confirmTripAndGenerateInvoice(tripId: string): { trip: RentalTrip; invoice: Invoice } {
    const trip = mockStorage.getRentalTripById(tripId);
    if (!trip) {
      throw new Error(`Trip ${tripId} not found.`);
    }

    const state = mockStorage.getState();
    const invNumber = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(state.invoices.length + 1).padStart(3, '0')}`;

    const upiLink = generateUpiDeepLink({
      payeeUpiId: trip.ownerUpiId || 'vehicleowner@upi',
      payeeName: trip.ownerName || 'Vehicle Owner',
      amountRupees: trip.totalAmountRupees,
      transactionNote: `Rental ${trip.vehicleRegNumber} (${trip.gpsDistanceKm} km)`,
      referenceId: invNumber,
    });

    const vehicle = mockStorage.getVehicleById(trip.vehicleId);
    let priceSnapshot: FuelPriceSnapshot | undefined = undefined;
    
    if (vehicle) {
      const stateName = vehicle.state || 'Kerala';
      const cityName = vehicle.city || 'Kozhikode';
      const fp = mockStorage.getFuelPrice(vehicle.fuelType, stateName, cityName)
        || mockStorage.getFuelPrice(vehicle.fuelType, 'Kerala', 'Kozhikode');
      if (fp) {
        priceSnapshot = fuelPriceService.createPriceSnapshot(fp);
      }
    }

    const newInvoice: Invoice = {
      id: `inv_${Date.now()}`,
      tripId: trip.id,
      vehicleId: trip.vehicleId,
      vehicleRegNumber: trip.vehicleRegNumber,
      vehicleMakeModel: trip.vehicleModel,
      invoiceNumber: invNumber,
      title: 'VEHICLE RENTAL INVOICE',
      customerName: trip.riderName,
      customerPhone: trip.riderPhone,
      startOdometer: trip.startOdometer,
      endOdometer: trip.estimatedEndOdometer,
      distanceKm: trip.gpsDistanceKm,
      pricingMode: 'PER_KM',
      ratePerKmRupees: trip.ratePerKmRupees,
      perKmRateRupees: trip.ratePerKmRupees,
      additionalChargesRupees: trip.otherChargesRupees,
      subtotalRupees: trip.distanceChargeRupees,
      taxRupees: 0,
      totalRupees: trip.totalAmountRupees,
      payeeUpiId: trip.ownerUpiId || state.organization.upiId || 'vehicleowner@upi',
      payeeName: trip.ownerName || state.organization.upiPayeeName || 'Vehicle Owner',
      upiDeepLink: upiLink,

      paymentStatus: 'PENDING',
      priceSnapshot,
      tripStartTime: trip.startTime,
      tripEndTime: trip.endTime || new Date().toISOString(),
      issuedAt: new Date().toISOString(),
      notes: `GPS Distance: ${trip.gpsDistanceKm} km @ ₹${trip.ratePerKmRupees}/km. Vehicle: ${trip.vehicleRegNumber}`,
    };

    mockStorage.addInvoice(newInvoice);

    // Update vehicle's permanent currentOdometer and estimatedCurrentOdometer
    mockStorage.updateVehicleOdometer(trip.vehicleId, trip.estimatedEndOdometer, 'GPS_RIDE_COMPLETED', trip.id);

    // Transition trip state to INVOICE_GENERATED / PAYMENT_PENDING
    const updatedTrip: RentalTrip = {
      ...trip,
      invoiceId: newInvoice.id,
      status: 'PAYMENT_PENDING',
      upiDeepLink: upiLink,
      updatedAt: new Date().toISOString(),
    };

    mockStorage.updateRentalTrip(updatedTrip);

    return { trip: updatedTrip, invoice: newInvoice };
  }

  /**
   * Marks a trip payment as verified/paid and frees the vehicle back to AVAILABLE.
   */
  verifyPayment(tripId: string, txnReference?: string): RentalTrip {
    const trip = mockStorage.getRentalTripById(tripId);
    if (!trip) {
      throw new Error(`Trip ${tripId} not found.`);
    }

    if (trip.invoiceId) {
      mockStorage.updateInvoicePaymentStatus(trip.invoiceId, 'PAID', 'UPI_INTENT', txnReference || `UPI_${Date.now()}`);
    }

    // Free vehicle back to AVAILABLE
    mockStorage.updateVehicleStatus(trip.vehicleId, 'AVAILABLE');

    const completedTrip: RentalTrip = {
      ...trip,
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      upiTransactionRef: txnReference || `UPI_REF_${Date.now()}`,
      paidAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockStorage.updateRentalTrip(completedTrip);
    return completedTrip;
  }
}

export const rentalTripService = new RentalTripService();
