export const NOTIFICATION_TYPES = {
  APPOINTMENT_CREATED: 'appointment_created',
  APPOINTMENT_UPDATED: 'appointment_updated',
  APPOINTMENT_CANCELLED: 'appointment_cancelled',
  CLIENT_CREATED: 'client_created',
  SERVICE_CREATED: 'service_created',
  SYSTEM: 'system',
  // Payment deposit (seña) lifecycle
  PAYMENT_PROOF_SUBMITTED: 'payment_proof_submitted', // Admin: new proof to review
  PAYMENT_APPROVED: 'payment_approved',               // Client: payment approved
  PAYMENT_REJECTED: 'payment_rejected',               // Client: payment rejected
}
