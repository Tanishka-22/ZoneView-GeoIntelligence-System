import { Injectable, HttpStatus } from '@nestjs/common';
import { Prisma, DevelopmentRecord } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { GetDevelopmentRecordsDto } from './dto/get-development-records.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { AppException } from '../../common/exceptions/app.exception';

@Injectable()
export class DevelopmentRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: GetDevelopmentRecordsDto,
  ): Promise<PaginatedResult<DevelopmentRecord>> {
    const {
      page = 1,
      limit = 20,
      skip,
      locationId,
      category,
      organizationId,
      status,
      search,
      sort = 'createdAt',
      order = 'desc',
    } = query;

    const where: Prisma.DevelopmentRecordWhereInput = {
      ...(locationId && { locationId }),
      ...(organizationId && { organizationId }),
      ...(status && { status }),
      ...(category && { category: { slug: category } }), // filter through relation
      ...(search && {
        title: { contains: search, mode: 'insensitive' as const },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.developmentRecord.findMany({
        where,
        take: limit,
        skip,
        orderBy: { [sort]: order },
        include: {
          location: { select: { id: true, name: true, slug: true } },
          category: true,
          organization: true,
        },
      }),
      this.prisma.developmentRecord.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<DevelopmentRecord> {
    const record = await this.prisma.developmentRecord.findUnique({
      where: { id },
      include: {
        location: true,
        category: true,
        organization: true,
        dataSource: true,
        media: true,
      },
    });

    if (!record) {
      throw new AppException(
        'Development record not found',
        'DEVELOPMENT_RECORD_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }

    return record;
  }
}