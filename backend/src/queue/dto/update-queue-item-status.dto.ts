import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class UpdateQueueItemStatusDto {
  @IsNotEmpty()
  @IsIn(['QUEUED', 'PLAYING', 'COMPLETED', 'BLOCKED'])
  status: string;
}
