import { IsEnum } from 'class-validator';
import { PlanType } from '@prisma/client';

export class UpgradeSubscriptionDto {
  @IsEnum(PlanType, { message: 'planType must be one of: FREE, PRO, TEAM' })
  planType: PlanType;
}