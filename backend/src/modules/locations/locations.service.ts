import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { GetLocationsDto } from './dto/get-locations.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { AppException } from '../../common/exceptions/app.exception';
import { Location } from '@prisma/client';

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: GetLocationsDto): Promise<PaginatedResult<Location>> {
    const { page = 1, limit = 20, skip, state, search } = query;

    // Build the WHERE clause conditionally —
    // only add filters that were actually provided.
    const where = {
      ...(state && { state: { equals: state, mode: 'insensitive' as const } }),
      ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
    };

    // Run both queries in parallel — fetching the page of data
    // and counting the total don't depend on each other.
    const [data, total] = await Promise.all([
      this.prisma.location.findMany({
        where,
        take: limit,
        skip,
        orderBy: { name: 'asc' },
      }),
      this.prisma.location.count({ where }),
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

  async findById(id: string): Promise<Location> {
    const location = await this.prisma.location.findUnique({ where: { id } });

    if (!location) {
      throw new AppException(
        'Location not found',
        'LOCATION_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }

    return location;
  }

  async findBySlug(slug: string): Promise<Location> {
    const location = await this.prisma.location.findUnique({ where: { slug } });

    if (!location) {
      throw new AppException(
        'Location not found',
        'LOCATION_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }

    return location;
  }

  /**
   * Verifies the location exists, then returns its development records.
   * Reuses findById so the 404 behavior is consistent everywhere
   * a location is looked up by ID.
   */
  async findDevelopmentRecords(locationId: string) {
    await this.findById(locationId); // throws 404 if location doesn't exist

    return this.prisma.developmentRecord.findMany({
      where: { locationId },
      include: {
        category: true,
        organization: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findReports(locationId: string) {
    await this.findById(locationId);

    return this.prisma.report.findMany({
      where: { locationId },
      orderBy: { createdAt: 'desc' },
    });
  }
}