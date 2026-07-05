import { Test, TestingModule } from '@nestjs/testing';
import { AIInsightService } from './ai-insight.service';
import { PrismaService } from '../../../database/prisma.service';
import { AIService } from '../ai.service';
import { ContextBuilderService } from './context-builder.service';
import { PromptBuilderService } from './prompt-builder.service';
import { UsageService } from '../../usage/usage.service';
import { InsightType, UsageFeature } from '@prisma/client';
import { jest } from '@jest/globals';


describe('AIInsightService', () => {
  let service: AIInsightService;

  const mockPrisma = {
    aIInsight: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockAIService = {
    generate: jest.fn(),
    buildCacheKey: jest.fn().mockReturnValue('ai:test:abc123'),
  };

  const mockContextBuilder = {
    buildLocationContext: jest.fn(),
  };

  const mockPromptBuilder = {
    buildRegionalSummaryPrompt: jest.fn(),
  };

  const mockUsageService = {
    incrementUsage: jest.fn(),
  };

  const mockInsight = {
    id: 'insight-123',
    type: InsightType.REGIONAL_SUMMARY,
    content: 'Test AI insight content about regional development.',
    promptTokens: 200,
    completionTokens: 100,
    model: 'mock-v1',
    locationId: 'location-123',
    developmentRecordId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

//   beforeEach(async () => {
//     const module: TestingModule = await Test.createTestingModule({
//       providers: [
//         AIInsightService,
//         { provide: PrismaService, useValue: mockPrisma },
//         { provide: AIService, useValue: mockAIService },
//         { provide: ContextBuilderService, useValue: mockContextBuilder },
//         { provide: PromptBuilderService, useValue: mockPromptBuilder },
//         { provide: UsageService, useValue: mockUsageService },
//       ],
//     }).compile();

//     service = module.get<AIInsightService>(AIInsightService);

//     jest.clearAllMocks();
//   });
  beforeEach(async () => {
    jest.clearAllMocks();

    mockAIService.buildCacheKey.mockReturnValue('ai:test:abc123');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIInsightService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AIService, useValue: mockAIService },
        { provide: ContextBuilderService, useValue: mockContextBuilder },
        { provide: PromptBuilderService, useValue: mockPromptBuilder },
        { provide: UsageService, useValue: mockUsageService },
      ],
    }).compile();

    service = module.get(AIInsightService);
    });

  describe('explainLocation', () => {
    it('should return existing fresh insight without calling AI', async () => {
      // An insight exists in the DB that is fresh (within 24 hours)
      mockPrisma.aIInsight.findFirst.mockResolvedValue(mockInsight);

      const result = await service.explainLocation('location-123');

      expect(result).toEqual(mockInsight);

      // Critical: AI should NOT be called when fresh insight exists
      expect(mockAIService.generate).not.toHaveBeenCalled();
      expect(mockContextBuilder.buildLocationContext).not.toHaveBeenCalled();

      // Usage should NOT be incremented for cached insights
      expect(mockUsageService.incrementUsage).not.toHaveBeenCalled();
    });

    it('should generate new insight when no fresh insight exists', async () => {
      mockPrisma.aIInsight.findFirst.mockResolvedValue(null);
      mockContextBuilder.buildLocationContext.mockResolvedValue({
        name: 'Jabalpur',
        state: 'Madhya Pradesh',
        stats: { totalProjects: 4 },
        developments: [],
        organizationNames: [],
        categoryNames: [],
      });
      mockPromptBuilder.buildRegionalSummaryPrompt.mockReturnValue({
        systemPrompt: 'You are an analyst...',
        userPrompt: 'Analyze Jabalpur...',
      });
      mockAIService.generate.mockResolvedValue({
        content: 'Generated insight content',
        promptTokens: 300,
        completionTokens: 150,
        totalTokens: 450,
        model: 'mock-v1',
      });
      mockPrisma.aIInsight.create.mockResolvedValue(mockInsight);

      const result = await service.explainLocation('location-123', 'user-123');

// console.log('findFirst', mockPrisma.aIInsight.findFirst.mock.calls);
// console.log('context', mockContextBuilder.buildLocationContext.mock.calls);
// console.log('prompt', mockPromptBuilder.buildRegionalSummaryPrompt.mock.calls);
// console.log('generate', mockAIService.generate.mock.calls);
// console.log('create', mockPrisma.aIInsight.create.mock.calls);
// console.log('usage', mockUsageService.incrementUsage.mock.calls);   

expect(mockAIService.generate).toHaveBeenCalledTimes(1);
      expect(mockContextBuilder.buildLocationContext).toHaveBeenCalledWith('location-123');

      // Insight must be stored in the database
      expect(mockPrisma.aIInsight.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: InsightType.REGIONAL_SUMMARY,
            locationId: 'location-123',
          }),
        }),
      );

      // Usage must be incremented for fresh generation
      expect(mockUsageService.incrementUsage).toHaveBeenCalledWith(
        'user-123',
        UsageFeature.AI_INSIGHT,
      );

      expect(result).toEqual(mockInsight);
    });

    it('should NOT increment usage when userId is not provided', async () => {
      mockPrisma.aIInsight.findFirst.mockResolvedValue(null);
      mockContextBuilder.buildLocationContext.mockResolvedValue({} as any);
      mockPromptBuilder.buildRegionalSummaryPrompt.mockReturnValue({
        systemPrompt: '',
        userPrompt: '',
      });
      mockAIService.generate.mockResolvedValue({
        content: 'Content',
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        model: 'mock-v1',
      });
      mockPrisma.aIInsight.create.mockResolvedValue(mockInsight);

      // Called without userId (e.g., from a worker, not a user request)
      await service.explainLocation('location-123');

      expect(mockUsageService.incrementUsage).not.toHaveBeenCalled();
    });
  });
});