/**
 * Feature Flags and Freeze Utilities
 * Controls which features are enabled/disabled based on dates
 */

/**
 * Check if Home page is frozen (hidden)
 * Home page will be frozen for 1 month from app launch
 * @returns true if Home page should be hidden
 */
export function isHomePageFrozen(): boolean {
  // Check if freeze is enabled via environment variable
  // Default to true (frozen) if not explicitly set to "false"
  const freezeEnabled = process.env.HOME_PAGE_FREEZE_ENABLED !== "false";
  
  if (!freezeEnabled) {
    return false;
  }

  // Get freeze start date (defaults to current date if not set)
  const freezeStartDateStr = process.env.HOME_PAGE_FREEZE_START_DATE;
  const freezeDurationMonths = process.env.HOME_PAGE_FREEZE_DURATION_MONTHS 
    ? parseInt(process.env.HOME_PAGE_FREEZE_DURATION_MONTHS, 10) 
    : 1; // Default 1 month

  let freezeStartDate: Date;
  if (freezeStartDateStr) {
    freezeStartDate = new Date(freezeStartDateStr);
    if (isNaN(freezeStartDate.getTime())) {
      console.warn("Invalid HOME_PAGE_FREEZE_START_DATE format. Using current date.");
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

  return isFrozen;
}

/**
 * Get Home page freeze status with details
 */
export function getHomePageFreezeStatus(): {
  isFrozen: boolean;
  freezeStartDate?: Date;
  freezeEndDate?: Date;
  daysRemaining?: number;
  message?: string;
} {
  const freezeEnabled = process.env.HOME_PAGE_FREEZE_ENABLED !== "false";
  const freezeStartDateStr = process.env.HOME_PAGE_FREEZE_START_DATE;
  const freezeDurationMonths = process.env.HOME_PAGE_FREEZE_DURATION_MONTHS 
    ? parseInt(process.env.HOME_PAGE_FREEZE_DURATION_MONTHS, 10) 
    : 1;

  if (!freezeEnabled) {
    return {
      isFrozen: false,
      message: "Home page is currently available.",
    };
  }

  let freezeStartDate: Date;
  if (freezeStartDateStr) {
    freezeStartDate = new Date(freezeStartDateStr);
    if (isNaN(freezeStartDate.getTime())) {
      freezeStartDate = new Date();
    }
  } else {
    freezeStartDate = new Date();
  }

  const freezeEndDate = new Date(freezeStartDate);
  freezeEndDate.setMonth(freezeEndDate.getMonth() + freezeDurationMonths);

  const now = new Date();
  const isFrozen = now >= freezeStartDate && now < freezeEndDate;

  const daysRemaining = isFrozen 
    ? Math.ceil((freezeEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  if (isFrozen) {
    return {
      isFrozen: true,
      freezeStartDate,
      freezeEndDate,
      daysRemaining,
      message: `Home page will be available in ${daysRemaining} days.`,
    };
  }

  if (now >= freezeEndDate) {
    return {
      isFrozen: false,
      freezeStartDate,
      freezeEndDate,
      message: "Home page is now available.",
    };
  }

  return {
    isFrozen: false,
    freezeStartDate,
    freezeEndDate,
    message: `Home page will be frozen starting ${freezeStartDate.toLocaleDateString()}.`,
  };
}

/**
 * Get promo days remaining (for payment freeze)
 * This is a legacy function, kept for compatibility
 */
export function getPromoDaysRemaining(): number {
  // This can be calculated from payment freeze status if needed
  // For now, return a default value
  return 90; // 3 months default
}
