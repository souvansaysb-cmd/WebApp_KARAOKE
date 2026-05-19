import { Controller, Post, Get, Put, Delete, Body, Param, UseGuards, Req, HttpCode } from '@nestjs/common';
import { QueueService } from './queue.service';
import { CreateQueueItemDto } from './dto/create-queue-item.dto';
import { UpdateQueueItemStatusDto } from './dto/update-queue-item-status.dto';
import { CreateVoteDto } from './dto/create-vote.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('queue')
@UseGuards(JwtAuthGuard)
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  /**
   * Add a video to the queue
   */
  @Post('add')
  @HttpCode(201)
  async addToQueue(@Body() createQueueItemDto: CreateQueueItemDto, @Req() req: any) {
    return this.queueService.addVideoToQueue(createQueueItemDto, req.user.id);
  }

  /**
   * Get current queue state
   */
  @Get()
  async getQueue() {
    return this.queueService.getQueueState();
  }

  /**
   * Update video status
   */
  @Put(':videoId/status')
  async updateStatus(
    @Param('videoId') videoId: string,
    @Body() updateStatusDto: UpdateQueueItemStatusDto,
  ) {
    return this.queueService.updateVideoStatus(videoId, updateStatusDto);
  }

  /**
   * Remove video from queue
   */
  @Delete(':videoId')
  async removeFromQueue(@Param('videoId') videoId: string) {
    return this.queueService.removeVideoFromQueue(videoId);
  }

  /**
   * Add a vote to a queue item
   */
  @Post('vote')
  @HttpCode(201)
  async addVote(@Body() createVoteDto: CreateVoteDto, @Req() req: any) {
    return this.queueService.addVote(createVoteDto, req.user.id);
  }

  /**
   * Add a comment to a queue item
   */
  @Post('comment')
  @HttpCode(201)
  async addComment(@Body() createCommentDto: CreateCommentDto, @Req() req: any) {
    return this.queueService.addComment(createCommentDto, req.user.id);
  }

  /**
   * Get comments for a queue item
   */
  @Get(':queueItemId/comments')
  async getComments(@Param('queueItemId') queueItemId: string) {
    return this.queueService.getComments(queueItemId);
  }
}
