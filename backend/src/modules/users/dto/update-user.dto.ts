import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'Name cannot exceed 100 characters' })
  name?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;
}