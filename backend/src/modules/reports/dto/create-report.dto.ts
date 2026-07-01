import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateReportDto {
  @IsString()
  locationId: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}