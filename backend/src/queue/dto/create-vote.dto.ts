import { IsString, IsNotEmpty, IsInt, IsIn } from 'class-validator';

export class CreateVoteDto {
  @IsNotEmpty()
  @IsString()
  queueItemId: string;

  @IsNotEmpty()
  @IsInt()
  @IsIn([1, -1])
  value: number; // 1 for upvote, -1 for downvote
}
