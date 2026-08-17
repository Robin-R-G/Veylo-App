import { MaintenanceRecord, Issue, VehicleHealthScore } from '@/types';

export function calculateVehicleHealthScore(
  currentOdometer: number,
  maintenanceRecords: MaintenanceRecord[] = [],
  unresolvedIssues: Issue[] = [],
  openRecalls: number = 0,
): VehicleHealthScore {
  let score = 100;
  const factors: VehicleHealthScore['factors'] = [];

  // Factor 0: Open Safety Recalls (most critical — safety issue)
  if (openRecalls > 0) {
    score -= openRecalls * 15;
    factors.push({
      label: 'Safety Recalls',
      status: 'CRITICAL',
      detail: `${openRecalls} open NHTSA safety recall${openRecalls > 1 ? 's' : ''} require${openRecalls === 1 ? 's' : ''} immediate manufacturer service.`,
    });
  } else {
    factors.push({
      label: 'Safety Recalls',
      status: 'GOOD',
      detail: 'No open safety recalls on file.',
    });
  }

  // Factor 1: Unresolved Issues
  const criticalCount = unresolvedIssues.filter(i => i.severity === 'CRITICAL' || i.severity === 'HIGH').length;
  const mediumCount = unresolvedIssues.filter(i => i.severity === 'MEDIUM' || i.severity === 'LOW').length;

  if (criticalCount > 0) {
    score -= criticalCount * 25;
    factors.push({
      label: 'Reported Issues',
      status: 'CRITICAL',
      detail: `${criticalCount} high/critical issue(s) reported requiring immediate inspection.`,
    });
  } else if (mediumCount > 0) {
    score -= mediumCount * 10;
    factors.push({
      label: 'Reported Issues',
      status: 'WARNING',
      detail: `${mediumCount} minor/medium issue(s) reported.`,
    });
  } else {
    factors.push({
      label: 'Reported Issues',
      status: 'GOOD',
      detail: 'No active mechanical or safety issues logged.',
    });
  }

  // Factor 2: Maintenance Intervals & Service Recency
  const recentService = maintenanceRecords.find(m => m.serviceType === 'ENGINE_OIL' || m.serviceType === 'GENERAL_SERVICE');
  if (!recentService) {
    score -= 15;
    factors.push({
      label: 'Service History',
      status: 'WARNING',
      detail: 'No recorded engine oil or general service on file.',
    });
  } else {
    const kmSinceService = currentOdometer - recentService.odometerReading;
    if (kmSinceService > 5000) {
      score -= 20;
      factors.push({
        label: 'Engine Oil & Service',
        status: 'WARNING',
        detail: `Over ${Math.round(kmSinceService)} km since last service. Recommended service interval approaching.`,
      });
    } else {
      factors.push({
        label: 'Engine Oil & Service',
        status: 'GOOD',
        detail: `Last service recorded ${Math.round(kmSinceService)} km ago. Service status optimal.`,
      });
    }
  }

  // Factor 3: Insurance & Pollution Certificate Recency
  const today = new Date();
  const insurance = maintenanceRecords.find(m => m.serviceType === 'INSURANCE_RENEWAL' && m.nextDueDate);
  if (insurance && insurance.nextDueDate) {
    const dueDate = new Date(insurance.nextDueDate);
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    if (diffDays < 0) {
      score -= 20;
      factors.push({
        label: 'Insurance Certificate',
        status: 'CRITICAL',
        detail: 'Vehicle insurance expired. Renewal required immediately.',
      });
    } else if (diffDays <= 30) {
      score -= 5;
      factors.push({
        label: 'Insurance Certificate',
        status: 'WARNING',
        detail: `Insurance due for renewal in ${diffDays} days.`,
      });
    } else {
      factors.push({
        label: 'Insurance Certificate',
        status: 'GOOD',
        detail: `Insurance valid until ${insurance.nextDueDate}.`,
      });
    }
  }

  // Clamp score between 0 and 100
  score = Math.max(0, Math.min(100, score));

  // Determine star rating (1 to 5 stars)
  let stars = 5;
  if (score < 40) stars = 1;
  else if (score < 60) stars = 2;
  else if (score < 75) stars = 3;
  else if (score < 90) stars = 4;

  let statusLabel = 'Excellent';
  if (score < 50) statusLabel = 'Needs Attention';
  else if (score < 75) statusLabel = 'Fair';
  else if (score < 90) statusLabel = 'Good';

  return {
    score,
    stars,
    statusLabel,
    factors,
  };
}
