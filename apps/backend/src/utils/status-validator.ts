type StatusMap = {
  [key: string]: Set<string>;
};

const statusMap: StatusMap = {
  VisaApplicationStatus: new Set(['draft', 'submitted', 'approved', 'rejected', 'expired']),
  ApplicationStatus: new Set(['draft', 'submitted', 'under_review', 'approved', 'rejected']),
  DocumentChecklistStatus: new Set(['processing', 'ready', 'failed']),
  UserDocumentStatus: new Set(['pending', 'verified', 'rejected']),
  PaymentStatus: new Set(['pending', 'completed', 'failed', 'refunded', 'partially_refunded']),
  RefundStatus: new Set(['pending', 'processing', 'completed', 'failed']),
  WebhookStatus: new Set(['pending', 'processed', 'failed']),
  NotificationStatus: new Set(['pending', 'sent', 'failed']),
  EmailStatus: new Set(['pending', 'sent', 'failed']),
  DocumentCheckStatus: new Set(['OK', 'MISSING', 'PROBLEM', 'UNCERTAIN']),
};

export function assertStatus(enumName: keyof StatusMap, value: string): void {
  const allowed = statusMap[enumName];
  if (!allowed) return;
  if (!allowed.has(value)) {
    throw new Error(`Invalid status "${value}" for ${enumName}. Allowed: ${Array.from(allowed).join(', ')}`);
  }
}

export function safeStatus(enumName: keyof StatusMap, value: string): string {
  const allowed = statusMap[enumName];
  if (!allowed) return value;
  return allowed.has(value) ? value : Array.from(allowed)[0];
}

