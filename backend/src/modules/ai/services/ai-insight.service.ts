import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AIService } from '../ai.service';
import { ContextBuilderService } from './context-builder.service';
import { PromptBuilderService } from './prompt-builder.service';
import { InsightType, AIInsight } from '@prisma/client';
import { UsageService } from '../../usage/usage.service';
import { UsageFeature } from '@prisma/client';

@Injectable()
export class AIInsightService {
  private readonly logger = new Logger(AIInsightService.name);

  // How old (in hours) a stored insight can be before we regenerate.
  // 24 hours — development data doesn't change that frequently.
  private readonly INSIGHT_MAX_AGE_HOURS = 24;

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
    private readonly contextBuilder: ContextBuilderService,
    private readonly promptBuilder: PromptBuilderService,
    private readonly usageService: UsageService,
  ) {}

  // ─── Explain Location ─────────────────────────────────────────

  async explainLocation(locationId: string, userId?: string): Promise<AIInsight> {
    const existing = await this.findExistingInsight(
      InsightType.REGIONAL_SUMMARY,
      locationId,
      undefined,
    );

    if (existing) {
      this.logger.log(`Returning existing insight for location ${locationId}`);
      return existing;
    }

    const context = await this.contextBuilder.buildLocationContext(locationId);
    const { systemPrompt, userPrompt } =
      this.promptBuilder.buildRegionalSummaryPrompt(context);

    const aiResponse = await this.aiService.generate(userPrompt, {
      systemPrompt,
      maxTokens: 800,
      temperature: 0.7,
      cacheKey: this.aiService.buildCacheKey('location-summary', locationId),
    });

    const insight = await this.prisma.aIInsight.create({
      data: {
        type: InsightType.REGIONAL_SUMMARY,
        content: aiResponse.content,
        promptTokens: aiResponse.promptTokens,
        completionTokens: aiResponse.completionTokens,
        model: aiResponse.model,
        locationId,
      },
    });

    // Only increment usage when fresh generation occurs —
    // returning a cached/stored insight doesn't consume quota
    if (userId) {
      await this.usageService.incrementUsage(userId, UsageFeature.AI_INSIGHT);
    }

    this.logger.log(`Insight stored: ${insight.id}`);
    return insight;
  }

  // ─── Explain Development Record ───────────────────────────────

  async explainDevelopmentRecord(recordId: string): Promise<AIInsight> {
    const existing = await this.findExistingInsight(
      InsightType.DEVELOPMENT_ANALYSIS,
      undefined,
      recordId,
    );

    if (existing) {
      this.logger.log(
        `Returning existing insight for development record ${recordId}`,
      );
      return existing;
    }

    const context =
      await this.contextBuilder.buildDevelopmentRecordContext(recordId);

    const { systemPrompt, userPrompt } =
      this.promptBuilder.buildDevelopmentExplanationPrompt(context);

    const aiResponse = await this.aiService.generate(userPrompt, {
      systemPrompt,
      maxTokens: 600,
      temperature: 0.7,
      cacheKey: this.aiService.buildCacheKey('development-analysis', recordId),
    });

    const insight = await this.prisma.aIInsight.create({
      data: {
        type: InsightType.DEVELOPMENT_ANALYSIS,
        content: aiResponse.content,
        promptTokens: aiResponse.promptTokens,
        completionTokens: aiResponse.completionTokens,
        model: aiResponse.model,
        developmentRecordId: recordId,
      },
    });

    this.logger.log(`Insight stored: ${insight.id}`);
    return insight;
  }

  // ─── Compare Locations ────────────────────────────────────────

  async compareLocations(locationIds: string[]): Promise<AIInsight> {
    // Comparison cache key includes all location IDs sorted —
    // comparing [A, B] and [B, A] should return the same cached insight
    const sortedIds = [...locationIds].sort();
    const cacheKey = this.aiService.buildCacheKey(
      'comparison',
      sortedIds.join(':'),
    );

    const context =
      await this.contextBuilder.buildComparisonContext(locationIds);

    const { systemPrompt, userPrompt } =
      this.promptBuilder.buildComparisonPrompt(context);

    const aiResponse = await this.aiService.generate(userPrompt, {
      systemPrompt,
      maxTokens: 1000,
      temperature: 0.7,
      cacheKey,
    });

    // Comparisons are not stored in the DB — they're ephemeral and
    // depend on the combination of locations, making lookup complex.
    // Redis caching (inside AIService) is sufficient for comparisons.
    const locationNames = context.locations.map((l) => l.name).join(' vs ');

    // We store with the first location's ID as a loose association
    const insight = await this.prisma.aIInsight.create({
      data: {
        type: InsightType.COMPARATIVE_ANALYSIS,
        content: aiResponse.content,
        promptTokens: aiResponse.promptTokens,
        completionTokens: aiResponse.completionTokens,
        model: aiResponse.model,
        locationId: sortedIds[0], // loose association to first location
      },
    });

    this.logger.log(
      `Comparison insight stored: ${locationNames} (${insight.id})`,
    );

    return insight;
  }

  // ─── AI Chat ─────────────────────────────────────────────────

async chat(
  message: string,
  locationId?: string,
): Promise<{ response: string; model: string }> {
  // Build location context if a location was specified
  let locationContext;
  if (locationId) {
    locationContext =
      await this.contextBuilder.buildLocationContext(locationId);
  }

  const { systemPrompt, userPrompt } =
    this.promptBuilder.buildChatPrompt(message, locationContext);

  // Chat responses are NOT cached — every message is unique
  // and caching would break the conversational feel.
  // We also don't store chat responses as AIInsights — they're
  // ephemeral conversational exchanges, not persistent intelligence.
  const aiResponse = await this.aiService.generate(userPrompt, {
    systemPrompt,
    maxTokens: 400,
    temperature: 0.8, // slightly higher temperature for conversational variety
    skipCache: true,  // never cache chat responses
  });

  return {
    response: aiResponse.content,
    model: aiResponse.model,
  };
}

  // ─── Private Helpers ──────────────────────────────────────────

  /**
   * Find an existing insight that is still fresh enough to return.
   * Returns null if no insight exists or if it's older than INSIGHT_MAX_AGE_HOURS.
   */
  private async findExistingInsight(
    type: InsightType,
    locationId: string | undefined,
    developmentRecordId: string | undefined,
  ): Promise<AIInsight | null> {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - this.INSIGHT_MAX_AGE_HOURS);

    return this.prisma.aIInsight.findFirst({
      where: {
        type,
        locationId: locationId ?? undefined,
        developmentRecordId: developmentRecordId ?? undefined,
        createdAt: { gte: cutoff }, // only return insights newer than cutoff
      },
      orderBy: { createdAt: 'desc' }, // most recent first if multiple exist
    });
  }
}