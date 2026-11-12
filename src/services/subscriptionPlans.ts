export const SUBSCRIPTION_PLANS = [
  { id: '1-month', title: '1 Month', months: 1, days: 30, pricePhp: 75 },
  { id: '2-months', title: '2 Months', months: 2, days: 60, pricePhp: 120 },
  { id: '3-months', title: '3 Months', months: 3, days: 90, pricePhp: 165 },
  { id: '6-months', title: '6 Months', months: 6, days: 180, pricePhp: 300 },
  { id: '12-months', title: '12 Months', months: 12, days: 365, pricePhp: 550 }
] as const;

export type SubscriptionPlanId = typeof SUBSCRIPTION_PLANS[number]['id'];
export type PaymentProvider = 'gcash' | 'maya';

export interface SubscriptionPaymentSettings {
  gcashDisplayName: string;
  gcashAccountNumber: string;
  gcashQrImageUrl: string;
  mayaDisplayName: string;
  mayaAccountNumber: string;
  mayaQrImageUrl: string;
}

export interface SubscriptionPaymentRequest {
  id: number;
  username: string;
  displayName: string;
  email: string;
  planId: SubscriptionPlanId;
  provider: PaymentProvider;
  transactionReference: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt: string | null;
}
