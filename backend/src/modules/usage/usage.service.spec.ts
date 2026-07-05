import { Test, TestingModule } from '@nestjs/testing';
import { UsageService } from './usage.service';
import { PrismaService } from '../../database/prisma.service';
import { UsageFeature } from '@prisma/client';

describe('UsageService', () => {
  let usageService: UsageService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockPrisma = {
    usageRecord: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsageService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    usageService = module.get<UsageService>(UsageService);
    prismaService = module.get(PrismaService);

    jest.clearAllMocks();
  });

  describe('getCurrentUsage', () => {
    it('should return 0 when no usage record exists', async () => {
      mockPrisma.usageRecord.findUnique.mockResolvedValue(null);

      const result = await usageService.getCurrentUsage(
        'user-123',
        UsageFeature.AI_INSIGHT,
      );

      expect(result).toBe(0);
    });

    it('should return the count from the usage record', async () => {
      mockPrisma.usageRecord.findUnique.mockResolvedValue({
        id: 'rec-1',
        count: 15,
        feature: UsageFeature.AI_INSIGHT,
        userId: 'user-123',
        billingCycle: '2026-07',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await usageService.getCurrentUsage(
        'user-123',
        UsageFeature.AI_INSIGHT,
      );

      expect(result).toBe(15);
    });
  });

  describe('incrementUsage', () => {
    it('should upsert usage record with atomic increment', async () => {
      mockPrisma.usageRecord.upsert.mockResolvedValue({} as any);

      await usageService.incrementUsage('user-123', UsageFeature.AI_INSIGHT);

      expect(mockPrisma.usageRecord.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { count: { increment: 1 } },
          create: expect.objectContaining({
            userId: 'user-123',
            feature: UsageFeature.AI_INSIGHT,
            count: 1,
          }),
        }),
      );
    });

    it('should use the current billing cycle in the upsert key', async () => {
      mockPrisma.usageRecord.upsert.mockResolvedValue({} as any);

      await usageService.incrementUsage('user-123', UsageFeature.AI_REPORT);

      const call = mockPrisma.usageRecord.upsert.mock.calls[0][0];
      const cycle = call.where.userId_feature_billingCycle.billingCycle;

      // Billing cycle must match YYYY-MM format for current month
      expect(cycle).toMatch(/^\d{4}-\d{2}$/);

      const now = new Date();
      const expectedCycle = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      expect(cycle).toBe(expectedCycle);
    });
  });
});