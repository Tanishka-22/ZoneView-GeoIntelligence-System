import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class GetLocationsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  search?: string; // matches against location name
}