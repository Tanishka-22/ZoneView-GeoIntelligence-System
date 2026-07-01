import { Injectable, HttpStatus } from '@nestjs/common';
import { DevelopmentRecord } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import { CreateDevelopmentRecordDto } from './dto/create-development-record.dto';
import { UpdateDevelopmentRecordDto } from './dto/update-development-record.dto';
import { AppException } from '../../../common/exceptions/app.exception';

@Injectable()
export class AdminDevelopmentRecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async create(dto: CreateDevelopmentRecordDto): Promise<DevelopmentRecord> {
    // Validate that referenced relations actually exist before creating —
    // without this, Prisma would throw an unclear foreign key constraint error.
    await this.validateRelations(dto.locationId, dto.categoryId, dto.organizationId);

    const record = await this.prisma.developmentRecord.create({
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        budget: dto.budget,
        locationId: dto.locationId,
        categoryId: dto.categoryId,
        organizationId: dto.organizationId,
        dataSourceId: dto.dataSourceId,
      },
    });

    // New data exists now — any cached search results are stale.
    // We don't know exactly which queries would have matched this new
    // record, so we clear all search cache entries rather than trying
    // to selectively invalidate. Simpler and correct, at the cost of
    // some cache churn — acceptable since admin writes are infrequent.
    await this.cache.delByPattern('search:*');

    return record;
  }

  async update(
    id: string,
    dto: UpdateDevelopmentRecordDto,
  ): Promise<DevelopmentRecord> {
    await this.findByIdOrThrow(id);

    if (dto.locationId || dto.categoryId || dto.organizationId) {
      await this.validateRelations(dto.locationId, dto.categoryId, dto.organizationId);
    }

    const record = await this.prisma.developmentRecord.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        budget: dto.budget,
        locationId: dto.locationId,
        categoryId: dto.categoryId,
        organizationId: dto.organizationId,
        dataSourceId: dto.dataSourceId,
      },
    });

    await this.cache.delByPattern('search:*');

    return record;
  }

  async delete(id: string): Promise<void> {
    await this.findByIdOrThrow(id);

    await this.prisma.developmentRecord.delete({ where: { id } });

    await this.cache.delByPattern('search:*');
  }

  private async findByIdOrThrow(id: string): Promise<DevelopmentRecord> {
    const record = await this.prisma.developmentRecord.findUnique({ where: { id } });

    if (!record) {
      throw new AppException(
        'Development record not found',
        'DEVELOPMENT_RECORD_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }

    return record;
  }

  private async validateRelations(
    locationId?: string,
    categoryId?: string,
    organizationId?: string,
  ): Promise<void> {
    if (locationId) {
      const location = await this.prisma.location.findUnique({ where: { id: locationId } });
      if (!location) {
        throw new AppException('Location not found', 'LOCATION_NOT_FOUND', HttpStatus.BAD_REQUEST);
      }
    }

    if (categoryId) {
      const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
      if (!category) {
        throw new AppException('Category not found', 'CATEGORY_NOT_FOUND', HttpStatus.BAD_REQUEST);
      }
    }

    if (organizationId) {
      const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
      if (!org) {
        throw new AppException('Organization not found', 'ORGANIZATION_NOT_FOUND', HttpStatus.BAD_REQUEST);
      }
    }
  }
}