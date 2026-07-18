export interface CreateOrderResult {
  orderId: string;
  amount: number; // in paise (smallest unit)
  currency: string;
  keyId: string; // public key, safe to send to frontend
}

export interface VerifyPaymentInput {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface PaymentProvider {
  createOrder(
    amountInRupees: number,
    receipt: string,
  ): Promise<CreateOrderResult>;
  verifyPayment(input: VerifyPaymentInput): Promise<boolean>;
}
