import { RentalTrip, GPSPoint, TripStatus, Invoice, Vehicle, FuelPriceSnapshot } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { filterAndValidateGpsPoint } from './gpsTrackingEngine';
import { generateUpiDeepLink } from './financialEngine';
import { computePlatformFee } from './platformEconomics';
import { authService } from './authService';
import { fuelPriceService } from './fuelPriceService';

export class RentalTripService {
  /**
   * Starts a new rental trip for a rider on a verified vehicle.
   */
  async startTrip(params: {
    vehicleId: string;
    riderName: string;
    riderPhone: string;
    startCoordinates?: { lat: number; lng: number };
  }): Promise<RentalTrip> {
    const supabase = createClient();

    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', params.vehicleId)
      .single();

    if (!vehicle) {
      throw new Error('Vehicle not found.');
    }

    if (vehicle.status !== 'AVAILABLE') {
      throw new Error(`Vehicle is currently ${vehicle.status}. Only available vehicles can be rented.`);
    }

    const session = authService.getSession();
    const riderId = session?.userId || `rider_${Date.now()}`;
    const riderName = (session?.name || params.riderName).trim() || 'Rider';
    const riderPhone = (session?.phone || params.riderPhone).trim() || '+91 94000 11223';

    const { count: tripCount } = await supabase
      .from('rental_trips')
      .select('id', { count: 'exact', head: true });

    const tripId = `TRIP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String((tripCount || 0) + 1).padStart(3, '0')}`;

    const initialPoint: GPSPoint | undefined = params.startCoordinates
      ? {
          latitude: params.startCoordinates.lat,
          longitude: params.startCoordinates.lng,
          accuracy: 10,
          timestamp: Date.now(),
        }
      : undefined;

    const { data: org } = await supabase
      .from('organizations')
      .select('upi_id, upi_payee_name')
      .eq('id', vehicle.organizationId)
      .maybeSingle();

    const newTrip: RentalTrip = {
      id: tripId,
      vehicleId: vehicle.id,
      vehicleRegNumber: vehicle.registrationNumber,
      vehicleModel: `${vehicle.make} ${vehicle.model}`,
      vehicleType: vehicle.vehicleType,
      ownerId: vehicle.ownerId,
      ownerName: 'Robin (Owner)',
      ownerUpiId: vehicle.ownerUpiId || org?.upi_id || 'vehicleowner@upi',
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

    await supabase.from('rental_trips').insert(newTrip);

    await supabase
      .from('vehicles')
      .update({ status: 'IN_USE', updated_at: new Date().toISOString() })
      .eq('id', vehicle.id);

    return newTrip;
  }

  /**
   * Ingests a new GPS reading during an active trip.
   */
  async ingestGpsPoint(tripId: string, point: GPSPoint): Promise<RentalTrip> {
    const supabase = createClient();

    const { data: trip } = await supabase
      .from('rental_trips')
      .select('*')
      .eq('id', tripId)
      .single();

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

    await supabase
      .from('rental_trips')
      .update(updatedTrip)
      .eq('id', tripId);

    return updatedTrip;
  }

  /**
   * Ends an active rental trip and transitions to CONFIRMATION_PENDING.
   */
  async endTrip(tripId: string, manualDistanceOverrideKm?: number): Promise<RentalTrip> {
    const supabase = createClient();

    const { data: trip } = await supabase
      .from('rental_trips')
      .select('*')
      .eq('id', tripId)
      .single();

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

    await supabase
      .from('rental_trips')
      .update(updatedTrip)
      .eq('id', tripId);

    return updatedTrip;
  }

  /**
   * Confirms the trip, generates the invoice, creates UPI deep-link, and updates the vehicle digital mileage ledger.
   */
  async confirmTripAndGenerateInvoice(tripId: string): Promise<{ trip: RentalTrip; invoice: Invoice }> {
    const supabase = createClient();

    const { data: trip } = await supabase
      .from('rental_trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (!trip) {
      throw new Error(`Trip ${tripId} not found.`);
    }

    const { count: invoiceCount } = await supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true });

    const invNumber = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String((invoiceCount || 0) + 1).padStart(3, '0')}`;

    const { data: monetizationData } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'monetization')
      .single();

    const monetization = monetizationData?.value || {
      platformFeeEnabled: false,
      platformFeeType: 'NONE',
      platformFeeValue: 0,
      advertisingEnabled: true,
      trialDays: 14,
    };

    const platformFeeRupees = computePlatformFee(trip.distanceChargeRupees, monetization);

    const finalTotal = trip.totalAmountRupees + platformFeeRupees;

    const upiLink = generateUpiDeepLink({
      payeeUpiId: trip.ownerUpiId || 'vehicleowner@upi',
      payeeName: trip.ownerName || 'Vehicle Owner',
      amountRupees: finalTotal,
      transactionNote: `Rental ${trip.vehicleRegNumber} (${trip.gpsDistanceKm} km)`,
      referenceId: invNumber,
    });

    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', trip.vehicleId)
      .single();

    let priceSnapshot: FuelPriceSnapshot | undefined = undefined;

    if (vehicle) {
      const stateName = vehicle.state || 'Kerala';
      const cityName = vehicle.city || 'Kozhikode';

      let { data: fp } = await supabase
        .from('fuel_prices')
        .select('*')
        .eq('fuel_type', vehicle.fuelType)
        .eq('state', stateName)
        .eq('city', cityName)
        .maybeSingle();

      if (!fp) {
        const fallback = await supabase
          .from('fuel_prices')
          .select('*')
          .eq('fuel_type', vehicle.fuelType)
          .eq('state', 'Kerala')
          .eq('city', 'Kozhikode')
          .maybeSingle();
        fp = fallback.data;
      }

      if (fp) {
        priceSnapshot = fuelPriceService.createPriceSnapshot(fp);
      }
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('upi_id, upi_payee_name')
      .eq('id', vehicle?.organizationId || '')
      .maybeSingle();

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
      totalRupees: finalTotal,
      platformFeeRupees,
      payeeUpiId: trip.ownerUpiId || org?.upi_id || 'vehicleowner@upi',
      payeeName: trip.ownerName || org?.upi_payee_name || 'Vehicle Owner',
      upiDeepLink: upiLink,

      paymentStatus: 'PENDING',
      priceSnapshot,
      tripStartTime: trip.startTime,
      tripEndTime: trip.endTime || new Date().toISOString(),
      issuedAt: new Date().toISOString(),
      notes: `GPS Distance: ${trip.gpsDistanceKm} km @ ₹${trip.ratePerKmRupees}/km. Vehicle: ${trip.vehicleRegNumber}`,
    };

    await supabase.from('invoices').insert(newInvoice);

    // Update vehicle odometer
    if (vehicle) {
      const prev = vehicle.currentOdometer;
      await supabase
        .from('vehicles')
        .update({
          current_omdometer: trip.estimatedEndOdometer,
          estimated_current_omdometer: trip.estimatedEndOdometer,
          updated_at: new Date().toISOString(),
        })
        .eq('id', trip.vehicleId);

      await supabase.from('odometer_history').insert({
        vehicle_id: trip.vehicleId,
        previous_reading: prev,
        new_reading: trip.estimatedEndOdometer,
        difference: Math.round((trip.estimatedEndOdometer - prev) * 100) / 100,
        reason: 'GPS_RIDE_COMPLETED',
        trip_id: trip.id,
        notes: 'Automatic GPS tracking update',
        timestamp: new Date().toISOString(),
      });
    }

    const updatedTrip: RentalTrip = {
      ...trip,
      invoiceId: newInvoice.id,
      status: 'PAYMENT_PENDING',
      upiDeepLink: upiLink,
      updatedAt: new Date().toISOString(),
    };

    await supabase
      .from('rental_trips')
      .update(updatedTrip)
      .eq('id', tripId);

    return { trip: updatedTrip, invoice: newInvoice };
  }

  /**
   * Marks a trip payment as verified/paid and frees the vehicle back to AVAILABLE.
   */
  async verifyPayment(tripId: string, txnReference?: string): Promise<RentalTrip> {
    const supabase = createClient();

    const { data: trip } = await supabase
      .from('rental_trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (!trip) {
      throw new Error(`Trip ${tripId} not found.`);
    }

    if (trip.invoiceId) {
      await supabase
        .from('invoices')
        .update({
          paymentStatus: 'PAID',
          paymentMethod: 'UPI_INTENT',
          upiTransactionRef: txnReference || `UPI_${Date.now()}`,
          paidAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .eq('id', trip.invoiceId);
    }

    await supabase
      .from('vehicles')
      .update({ status: 'AVAILABLE', updated_at: new Date().toISOString() })
      .eq('id', trip.vehicleId);

    const completedTrip: RentalTrip = {
      ...trip,
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      upiTransactionRef: txnReference || `UPI_REF_${Date.now()}`,
      paidAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await supabase
      .from('rental_trips')
      .update(completedTrip)
      .eq('id', tripId);

    return completedTrip;
  }
}

export const rentalTripService = new RentalTripService();
