import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';
import {
  PaymentProvider,
  CreateOrderResult,
  VerifyPaymentInput,
} from '../interfaces/payment-provider.interface';

@Injectable()
export class RazorpayPaymentProvider implements PaymentProvider {
  private readonly logger = new Logger(RazorpayPaymentProvider.name);
  private readonly client: Razorpay;
  private readonly keyId: string;
  private readonly keySecret: string;

  constructor(private readonly configService: ConfigService) {
    this.keyId = this.configService.get<string>('payment.razorpayKeyId')!;
    this.keySecret = this.configService.get<string>(
      'payment.razorpayKeySecret',
    )!;

    this.client = new Razorpay({
      key_id: this.keyId,
      key_secret: this.keySecret,
    });
  }

  async createOrder(
    amountInRupees: number,
    receipt: string,
  ): Promise<CreateOrderResult> {
    // Razorpay works in paise (1 rupee = 100 paise) — smallest currency unit,
    // same reason Stripe uses cents. Avoids floating point money bugs.
    const amountInPaise = Math.round(amountInRupees * 100);

    const order = await this.client.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt,
    });

    this.logger.log(
      `Razorpay order created: ${order.id} for ₹${amountInRupees}`,
    );

    return {
      orderId: order.id,
      amount: amountInPaise,
      currency: 'INR',
      keyId: this.keyId, // safe to expose — it's the public key
    };
  }

  /**
   * Verifies the payment signature Razorpay sends back after checkout.
   * This is the security-critical step — it proves the payment response
   * actually came from Razorpay and wasn't forged by a malicious client.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async verifyPayment(input: VerifyPaymentInput): Promise<boolean> {
    const { orderId, paymentId, signature } = input;

    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const isValid = expectedSignature === signature;

    if (!isValid) {
      this.logger.warn(
        `Signature mismatch for order ${orderId} — possible tampering`,
      );
    }

    return isValid;
  }
}
