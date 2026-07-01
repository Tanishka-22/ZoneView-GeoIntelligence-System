import { Controller, Get, Param, Query, Post, UseGuards } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { GetLocationsDto } from './dto/get-locations.dto';
import { AIInsightService } from '../ai/services/ai-insight.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../subscriptions/guards/subscription.guard';
import { UsageGuard } from '../usage/guards/usage.guard';
import { Feature } from '../../common/decorators/feature.decorator';

@Controller('locations')
export class LocationsController {
  constructor(
    private readonly locationsService: LocationsService,
    private readonly aiInsightService: AIInsightService,
  ) {}

  @Get()
  async findAll(@Query() query: GetLocationsDto) {
    const result = await this.locationsService.findAll(query);
    return {
      success: true,
      message: 'Locations fetched successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const location = await this.locationsService.findById(id);
    return {
      success: true,
      message: 'Location fetched successfully',
      data: { location },
    };
  }

  @Get(':id/developments')
  async getDevelopments(@Param('id') id: string) {
    const developments =
      await this.locationsService.findDevelopmentRecords(id);
    return {
      success: true,
      message: 'Development records fetched successfully',
      data: { developments },
    };
  }

  @Get(':id/reports')
  async getReports(@Param('id') id: string) {
    const reports = await this.locationsService.findReports(id);
    return {
      success: true,
      message: 'Reports fetched successfully',
      data: { reports },
    };
  }

  /**
   * AI endpoint — requires authentication.
   * Generating AI insights is a premium feature (Sprint 7 adds usage quota).
   * For now, authentication alone is the gate.
   */
  @Post(':id/explain')
  @Feature('AI_INSIGHT')
  @UseGuards(JwtAuthGuard, SubscriptionGuard, UsageGuard)
  async explain(@Param('id') id: string) {
    const insight = await this.aiInsightService.explainLocation(id);
    return {
      success: true,
      message: 'AI insight generated successfully',
      data: { insight },
    };
  }
}