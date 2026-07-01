import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { RecordStatus } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

const SORTABLE_FIELDS = ['createdAt', 'startDate', 'title', 'budget'] as const;
type SortableField = (typeof SORTABLE_FIELDS)[number];

export class GetDevelopmentRecordsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  category?: string; // category slug, e.g. "transportation"

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsEnum(RecordStatus, {
    message: `status must be one of: ${Object.values(RecordStatus).join(', ')}`,
  })
  status?: RecordStatus;

  @IsOptional()
  @IsString()
  search?: string; // matches against title

  @IsOptional()
  @IsIn(SORTABLE_FIELDS, {
    message: `sort must be one of: ${SORTABLE_FIELDS.join(', ')}`,
  })
  sort?: SortableField = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';
}