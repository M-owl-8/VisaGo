/**
 * Payment Freeze Utility
 * Manages payment system freeze period (e.g., 3 months free trial)
 * Payments are frozen but code remains intact for easy re-enabling
 */

import { getEnvConfig } from '../config/env';

export interface PaymentFreezeStatus {
  isFrozen: boolean;
  freezeStartDate?: Date;
  freezeEndDate?: Date;
  daysRemaining?: number;
  message?: string;
}

/**
 * Check if payments are currently frozen
 * @returns PaymentFreezeStatus with freeze information
 */
export function getPaymentFreezeStatus(): PaymentFreezeStatus {
  const envConfig = getEnvConfig();

  // Check if freeze is enabled via environment variable
  // Default to true (enabled) if not explicitly set to "false"
  const freezeEnabled = process.env.PAYMENT_FREEZE_ENABLED !== 'false';
  const freezeStartDateStr = process.env.PAYMENT_FREEZE_START_DATE;
  const freezeDurationMonths = process.env.PAYMENT_FREEZE_DURATION_MONTHS
    ? parseInt(process.env.PAYMENT_FREEZE_DURATION_MONTHS, 10)
    : 3; // Default 3 months

  // If freeze is explicitly disabled, payments are active
  if (!freezeEnabled) {
    return {
      isFrozen: false,
      message: 'Payments are currently active.',
    };
  }

  // Parse freeze start date (format: YYYY-MM-DD)
  let freezeStartDate: Date;
  if (freezeStartDateStr) {
    freezeStartDate = new Date(freezeStartDateStr);
    if (isNaN(freezeStartDate.getTime())) {
      console.warn('Invalid PAYMENT_FREEZE_START_DATE format. Using current date.');
      freezeStartDate = new Date();
    }
  } else {
    // Default to current date if not specified
    freezeStartDate = new Date();
  }

  // Calculate freeze end date
  const freezeEndDate = new Date(freezeStartDate);
  freezeEndDate.setMonth(freezeEndDate.getMonth() + freezeDurationMonths);

  const now = new Date();
  const isFrozen = now >= freezeStartDate && now < freezeEndDate;

  // Calculate days remaining
  const daysRemaining = isFrozen
    ? Math.ceil((freezeEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  if (isFrozen) {
    return {
      isFrozen: true,
      freezeStartDate,
      freezeEndDate,
      daysRemaining,
      message: `Payments are currently free! This free period ends on ${freezeEndDate.toLocaleDateString()} (${daysRemaining} days remaining).`,
    };
  }

  // Freeze period has ended
  if (now >= freezeEndDate) {
    return {
      isFrozen: false,
      freezeStartDate,
      freezeEndDate,
      message: 'The free period has ended. Payments are now active.',
    };
  }

  // Freeze period hasn't started yet
  return {
    isFrozen: false,
    freezeStartDate,
    freezeEndDate,
    message: `Free period will start on ${freezeStartDate.toLocaleDateString()}.`,
  };
}

/**
 * Check if payments should be blocked
 * @returns true if payments are frozen and should be blocked
 */
export function isPaymentFrozen(): boolean {
  return getPaymentFreezeStatus().isFrozen;
}

/**
 * Get user-friendly message about payment freeze status
 */
export function getPaymentFreezeMessage(): string {
  const status = getPaymentFreezeStatus();

  if (status.isFrozen && status.message) {
    return status.message;
  }

  return 'Payments are currently active.';
}
