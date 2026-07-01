import { Controller, Get, UseGuards } from '@nestjs/common';
import { UsageService } from './usage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@Controller('usage')
@UseGuards(JwtAuthGuard)
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get()
  async getCurrentUsage(
    @CurrentUser() user: Omit<User, 'passwordHash'>,
  ) {
    const usage = await this.usageService.getUserUsage(user.id);

    return {
      success: true,
      message: 'Usage fetched successfully',
      data: usage,
    };
  }

  @Get('history')
  async getUsageHistory(
    @CurrentUser() user: Omit<User, 'passwordHash'>,
  ) {
    const history = await this.usageService.getUserUsageHistory(user.id);

    return {
      success: true,
      message: 'Usage history fetched successfully',
      data: { history },
    };
  }
}