import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateQueueItemDto {
  @IsNotEmpty()
  @IsString()
  videoId: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  thumbnail: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
