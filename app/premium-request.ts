export const PREMIUM_PAYMENT_METHODS = ["bank_transfer", "paypal", "other"] as const;
export type PremiumPaymentMethod = typeof PREMIUM_PAYMENT_METHODS[number];
export type PremiumRequestStatus = "pending" | "approved" | "rejected";

export type PremiumRequestInput = {
  amountKrw?: unknown;
  paymentMethod?: unknown;
  payerName?: unknown;
  paymentReference?: unknown;
  note?: unknown;
};

export function validatePremiumRequest(input: PremiumRequestInput) {
  const amountKrw = Math.round(Number(input.amountKrw));
  const paymentMethod = String(input.paymentMethod ?? "") as PremiumPaymentMethod;
  const payerName = String(input.payerName ?? "").trim();
  const paymentReference = String(input.paymentReference ?? "").trim();
  const note = String(input.note ?? "").trim();
  if (!Number.isSafeInteger(amountKrw) || amountKrw < 1 || amountKrw > 100_000_000) return { error: "Enter the amount you paid in KRW." } as const;
  if (!PREMIUM_PAYMENT_METHODS.includes(paymentMethod)) return { error: "Choose a valid payment method." } as const;
  if (payerName.length < 2 || payerName.length > 80) return { error: "Enter the payer name used for the payment." } as const;
  if (paymentReference.length < 4 || paymentReference.length > 120) return { error: "Enter a payment reference that the administrator can verify." } as const;
  if (note.length > 500) return { error: "The payment note must be 500 characters or fewer." } as const;
  return { value: { amountKrw, paymentMethod, payerName, paymentReference, note } } as const;
}

export function canReviewPremiumRequest(status: string) {
  return status === "pending";
}
