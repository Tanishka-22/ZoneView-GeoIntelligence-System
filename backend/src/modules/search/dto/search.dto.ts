import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

const SEARCH_TYPES = ['all', 'location', 'development'] as const;
type SearchType = (typeof SEARCH_TYPES)[number];

export class SearchDto {
  @IsString()
  @MinLength(2, { message: 'Search query must be at least 2 characters' })
  q: string;

  @IsOptional()
  @IsIn(SEARCH_TYPES)
  type?: SearchType = 'all';
}