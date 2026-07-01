import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AIInsightService } from './services/ai-insight.service';
import { CompareLocationsDto } from './dto/compare-locations.dto';
import { ChatDto } from './dto/chat.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Feature } from '../../common/decorators/feature.decorator';
import { SubscriptionGuard } from '../subscriptions/guards/subscription.guard';
import { UsageGuard } from '../usage/guards/usage.guard';

@Controller('ai')
export class AIController {
  constructor(private readonly aiInsightService: AIInsightService) {}

  @Post('compare')
  @Feature('REGION_COMPARE')
  @UseGuards(JwtAuthGuard, SubscriptionGuard, UsageGuard)
  @HttpCode(HttpStatus.OK)
  async compare(@Body() dto: CompareLocationsDto) {
    const insight = await this.aiInsightService.compareLocations(
      dto.locationIds,
    );
    return {
      success: true,
      message: 'Comparison analysis generated successfully',
      data: { insight },
    };
  }

  @Post('chat')
  @Feature('AI_INSIGHT')
  @UseGuards(JwtAuthGuard, SubscriptionGuard, UsageGuard)
  @HttpCode(HttpStatus.OK)
  async chat(@Body() dto: ChatDto) {
    const result = await this.aiInsightService.chat(
      dto.message,
      dto.locationId,
    );
    return {
      success: true,
      message: 'Response generated successfully',
      data: {
        response: result.response,
        model: result.model,
      },
    };
  }
}