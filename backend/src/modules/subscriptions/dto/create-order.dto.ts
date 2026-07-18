import { IsEnum } from 'class-validator';
import { PlanType } from '@prisma/client';

export class CreateOrderDto {
  @IsEnum(PlanType)
  planType: PlanType;
}