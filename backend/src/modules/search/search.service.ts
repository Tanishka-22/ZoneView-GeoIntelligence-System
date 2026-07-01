import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { SearchDto } from './dto/search.dto';

export interface SearchResult {
  locations: Array<{ id: string; name: string; slug: string; state: string | null }>;
  developments: Array<{ id: string; title: string; status: string; locationId: string }>;
}

@Injectable()
export class SearchService {
  // 5 minutes — balances cache hit rate against staleness
  private readonly CACHE_TTL_SECONDS = 300;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async search(dto: SearchDto): Promise<SearchResult> {
    const { q, type = 'all' } = dto;
    const cacheKey = `search:${q.toLowerCase()}:${type}`;

    // 1. Check cache first
    const cached = await this.cache.get<SearchResult>(cacheKey);
    if (cached) {
      return cached;
    }

    // 2. Cache miss — query PostgreSQL
    const result = await this.queryDatabase(q, type);

    // 3. Store in cache for next time
    await this.cache.set(cacheKey, result, this.CACHE_TTL_SECONDS);

    return result;
  }

  private async queryDatabase(
    q: string,
    type: 'all' | 'location' | 'development',
  ): Promise<SearchResult> {
    const shouldSearchLocations = type === 'all' || type === 'location';
    const shouldSearchDevelopments = type === 'all' || type === 'development';

    const [locations, developments] = await Promise.all([
      shouldSearchLocations
        ? this.prisma.location.findMany({
            where: { name: { contains: q, mode: 'insensitive' } },
            select: { id: true, name: true, slug: true, state: true },
            take: 10,
          })
        : Promise.resolve([]),

      shouldSearchDevelopments
        ? this.prisma.developmentRecord.findMany({
            where: { title: { contains: q, mode: 'insensitive' } },
            select: { id: true, title: true, status: true, locationId: true },
            take: 10,
          })
        : Promise.resolve([]),
    ]);

    return { locations, developments };
  }

  /**
   * Autocomplete — lighter weight than full search.
   * Returns just names/titles for a dropdown, no caching needed
   * since results are tiny and this is meant to feel instant per-keystroke.
   */
  async suggestions(q: string): Promise<string[]> {
    if (q.length < 2) return [];

    const locations = await this.prisma.location.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      select: { name: true },
      take: 5,
    });

    return locations.map((l) => l.name);
  }
}