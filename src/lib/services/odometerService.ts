import { OdometerRecord } from '@/types';

export interface ValidateOdometerResult {
  isValid: boolean;
  errorMessage?: string;
}

export function validateOdometerUpdate(previousReading: number, newReading: number, isAdminCorrection = false): ValidateOdometerResult {
  if (isNaN(newReading) || newReading < 0) {
    return { isValid: false, errorMessage: 'Odometer reading must be a positive number' };
  }

  if (newReading < previousReading && !isAdminCorrection) {
    return {
      isValid: false,
      errorMessage: `New odometer reading (${newReading} km) cannot be less than previous reading (${previousReading} km). Request an admin correction if required.`,
    };
  }

  return { isValid: true };
}

export function createOdometerRecord(
  vehicleId: string,
  previousReading: number,
  newReading: number,
  reason: OdometerRecord['reason'],
  updatedByName = 'Vehicle Owner',
  rideId?: string,
  notes?: string
): OdometerRecord {
  return {
    id: `odo_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    vehicleId,
    previousReading,
    newReading,
    difference: newReading - previousReading,
    updatedByName,
    reason,
    rideId,
    notes,
    timestamp: new Date().toISOString(),
  };
}
