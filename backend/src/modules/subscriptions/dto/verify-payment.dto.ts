import { IsEnum, IsString } from 'class-validator';
import { PlanType } from '@prisma/client';

export class VerifyPaymentDto {
  @IsEnum(PlanType)
  planType: PlanType;

  @IsString()
  razorpay_order_id: string;

  @IsString()
  razorpay_payment_id: string;

  @IsString()
  razorpay_signature: string;
}