import { Controller, Get, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@Controller()
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  async getPlans() {
    const plans = await this.subscriptionsService.getPlans();
    return { success: true, message: 'Plans fetched successfully', data: { plans } };
  }

  @Get('subscription')
  @UseGuards(JwtAuthGuard)
  async getSubscription(@CurrentUser() user: Omit<User, 'passwordHash'>) {
    const subscription = await this.subscriptionsService.getCurrentSubscription(user.id);
    return { success: true, message: 'Subscription fetched successfully', data: { subscription } };
  }

  @Post('subscription/create-order')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async createOrder(@CurrentUser() user: Omit<User, 'passwordHash'>, @Body() dto: CreateOrderDto) {
    const order = await this.subscriptionsService.createUpgradeOrder(user.id, dto.planType);
    return { success: true, message: 'Order created', data: order };
  }

  @Post('subscription/verify-payment')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async verifyPayment(@CurrentUser() user: Omit<User, 'passwordHash'>, @Body() dto: VerifyPaymentDto) {
    const subscription = await this.subscriptionsService.verifyAndUpgrade(
      user.id,
      dto.planType,
      dto.razorpay_order_id,
      dto.razorpay_payment_id,
      dto.razorpay_signature,
    );
    return { success: true, message: 'Plan upgraded successfully', data: { subscription } };
  }
}