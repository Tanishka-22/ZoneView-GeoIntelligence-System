import { Controller, Get, Param, Query, Post, UseGuards } from '@nestjs/common';
import { DevelopmentRecordsService } from './development-records.service';
import { GetDevelopmentRecordsDto } from './dto/get-development-records.dto';
import { AIInsightService } from '../ai/services/ai-insight.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Feature } from '../../common/decorators/feature.decorator';
import { SubscriptionGuard } from '../subscriptions/guards/subscription.guard';
import { UsageGuard } from '../usage/guards/usage.guard';

@Controller('developments')
export class DevelopmentRecordsController {
  constructor(
    private readonly developmentRecordsService: DevelopmentRecordsService,
    private readonly aiInsightService: AIInsightService,
  ) {}

  @Get()
  async findAll(@Query() query: GetDevelopmentRecordsDto) {
    const result = await this.developmentRecordsService.findAll(query);
    return {
      success: true,
      message: 'Development records fetched successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const record = await this.developmentRecordsService.findById(id);
    return {
      success: true,
      message: 'Development record fetched successfully',
      data: { record },
    };
  }

  @Post(':id/explain')
  @Feature('AI_INSIGHT')
  @UseGuards(JwtAuthGuard, SubscriptionGuard, UsageGuard)
  async explain(@Param('id') id: string) {
    const insight =
      await this.aiInsightService.explainDevelopmentRecord(id);
    return {
      success: true,
      message: 'AI insight generated successfully',
      data: { insight },
    };
  }
}