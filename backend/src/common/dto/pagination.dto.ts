import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number) // query params arrive as strings — coerce to number
  @IsInt()
  @Min(1, { message: 'page must be at least 1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100, { message: 'limit cannot exceed 100' })
  limit?: number = 20;

  /** Computed offset for Prisma's `skip` — not part of the request, just a helper. */
  get skip(): number {
    return ((this.page ?? 1) - 1) * (this.limit ?? 20);
  }
}