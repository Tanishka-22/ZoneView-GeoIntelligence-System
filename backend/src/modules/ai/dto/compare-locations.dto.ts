import { IsArray, IsString, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class CompareLocationsDto {
  @IsArray()
  @ArrayMinSize(2, { message: 'At least 2 locations are required for comparison' })
  @ArrayMaxSize(3, { message: 'Maximum 3 locations can be compared at once' })
  @IsString({ each: true, message: 'Each location ID must be a string' })
  locationIds: string[];
}