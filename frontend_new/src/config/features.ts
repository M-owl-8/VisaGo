/**
 * Feature Flags Configuration
 * Control which features are enabled/disabled
 */

export const FEATURES = {
  // Payment is disabled for free period (3 months)
  PAYMENTS_ENABLED: false,
  
  // Free promotion end date
  FREE_PROMO_END_DATE: new Date('2025-02-15'), // 3 months from Nov 15, 2024
  
  // Other features
  PUSH_NOTIFICATIONS_ENABLED: true,
  AI_CHAT_ENABLED: true,
  GOOGLE_OAUTH_ENABLED: true,
  DOCUMENT_UPLOAD_ENABLED: true,
  
  // Admin features (not available in mobile app)
  ADMIN_PANEL_ENABLED: false,
};

/**
 * Check if app is in free promotion period
 */
export function isInFreePromoPeriod(): boolean {
  return new Date() < FEATURES.FREE_PROMO_END_DATE;
}

/**
 * Get days remaining in free promo
 */
export function getPromoDaysRemaining(): number {
  if (!isInFreePromoPeriod()) return 0;
  
  const now = new Date();
  const diffTime = FEATURES.FREE_PROMO_END_DATE.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

