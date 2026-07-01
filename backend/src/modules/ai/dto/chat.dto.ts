import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class ChatDto {
  @IsString()
  @MinLength(5, { message: 'Message must be at least 5 characters' })
  @MaxLength(500, { message: 'Message cannot exceed 500 characters' })
  message: string;

  @IsOptional()
  @IsString()
  locationId?: string; // optional — gives the chat context about a specific location
}