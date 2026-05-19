import { Injectable, BadRequestException, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQueueItemDto } from './dto/create-queue-item.dto';
import { UpdateQueueItemStatusDto } from './dto/update-queue-item-status.dto';
import { CreateVoteDto } from './dto/create-vote.dto';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class QueueService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Adds a video to the queue
   */
  async addVideoToQueue(createQueueItemDto: CreateQueueItemDto, userId: string) {
    try {
      // Validate YouTube video ID format
      if (!this.isValidYoutubeId(createQueueItemDto.videoId)) {
        throw new BadRequestException('Invalid YouTube video ID format');
      }

      // Check if video already exists in queue
      const existingVideo = await this.prisma.queueItem.findFirst({
        where: { videoId: createQueueItemDto.videoId, status: 'QUEUED' },
      });

      if (existingVideo) {
        throw new BadRequestException('This video is already in the queue');
      }

      // Check queue capacity (max 50 items)
      const queueCount = await this.prisma.queueItem.count({
        where: { status: 'QUEUED' },
      });

      if (queueCount >= 50) {
        throw new BadRequestException('Queue is at maximum capacity');
      }

      // Get the next position
      const nextPosition = queueCount + 1;

      // Create queue item
      const queueItem = await this.prisma.queueItem.create({
        data: {
          videoId: createQueueItemDto.videoId,
          title: createQueueItemDto.title,
          thumbnail: createQueueItemDto.thumbnail,
          userId,
          position: nextPosition,
          status: 'QUEUED',
        },
        include: {
          user: {
            select: { id: true, username: true, email: true },
          },
        },
      });

      return queueItem;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new HttpException('Failed to add video to queue', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Gets the current queue state, sorted by votes (descending) then position (ascending)
   */
  async getQueueState() {
    try {
      const queue = await this.prisma.queueItem.findMany({
        where: { status: { in: ['QUEUED', 'PLAYING'] } },
        include: {
          user: {
            select: { id: true, username: true, email: true },
          },
          votes_rel: true,
          comments: {
            include: {
              user: {
                select: { id: true, username: true },
              },
            },
          },
        },
      });

      // Calculate vote totals and sort: by voteCount desc, then position asc
      const queueWithVotes = queue
        .map((item) => ({
          ...item,
          voteCount: item.votes_rel.reduce((sum, vote) => sum + vote.value, 0),
        }))
        .sort((a, b) => {
          // Sort by vote count descending
          if (b.voteCount !== a.voteCount) {
            return b.voteCount - a.voteCount;
          }
          // Tiebreaker: position ascending
          return a.position - b.position;
        })
        // Update positions to reflect sorted order
        .map((item, index) => ({
          ...item,
          position: index + 1,
        }));

      return queueWithVotes;
    } catch (error) {
      throw new HttpException('Failed to fetch queue state', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Updates the status of a queue item
   */
  async updateVideoStatus(videoId: string, updateStatusDto: UpdateQueueItemStatusDto) {
    try {
      const queueItem = await this.prisma.queueItem.findFirst({
        where: { videoId },
      });

      if (!queueItem) {
        throw new NotFoundException(`Video with ID ${videoId} not found in queue`);
      }

      const updated = await this.prisma.queueItem.update({
        where: { id: queueItem.id },
        data: { status: updateStatusDto.status },
        include: {
          user: {
            select: { id: true, username: true, email: true },
          },
        },
      });

      return updated;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new HttpException('Failed to update video status', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Removes a video from the queue
   */
  async removeVideoFromQueue(videoId: string) {
    try {
      const queueItem = await this.prisma.queueItem.findFirst({
        where: { videoId },
      });

      if (!queueItem) {
        throw new NotFoundException(`Video with ID ${videoId} not found in queue`);
      }

      // Soft delete by marking as BLOCKED
      const removed = await this.prisma.queueItem.update({
        where: { id: queueItem.id },
        data: { status: 'BLOCKED' },
      });

      return removed;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new HttpException('Failed to remove video from queue', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Adds a vote to a queue item
   */
  async addVote(createVoteDto: CreateVoteDto, userId: string) {
    try {
      const queueItem = await this.prisma.queueItem.findFirst({
        where: { id: createVoteDto.queueItemId },
      });

      if (!queueItem) {
        throw new NotFoundException('Queue item not found');
      }

      // Check if user already voted
      const existingVote = await this.prisma.vote.findUnique({
        where: {
          userId_queueItemId: {
            userId,
            queueItemId: createVoteDto.queueItemId,
          },
        },
      });

      if (existingVote) {
        // Update existing vote
        const updated = await this.prisma.vote.update({
          where: { id: existingVote.id },
          data: { value: createVoteDto.value },
        });

        // Recalculate total votes on queue item
        await this.recalculateVoteCount(createVoteDto.queueItemId);

        return updated;
      }

      // Create new vote
      const vote = await this.prisma.vote.create({
        data: {
          userId,
          queueItemId: createVoteDto.queueItemId,
          value: createVoteDto.value,
        },
      });

      // Recalculate total votes on queue item
      await this.recalculateVoteCount(createVoteDto.queueItemId);

      return vote;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new HttpException('Failed to add vote', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Recalculates the total vote count on a queue item
   */
  private async recalculateVoteCount(queueItemId: string) {
    const votes = await this.prisma.vote.findMany({
      where: { queueItemId },
    });

    const totalVotes = votes.reduce((sum, vote) => sum + vote.value, 0);

    await this.prisma.queueItem.update({
      where: { id: queueItemId },
      data: { votes: totalVotes },
    });
  }

  /**
   * Adds a comment to a queue item
   */
  async addComment(createCommentDto: CreateCommentDto, userId: string) {
    try {
      const queueItem = await this.prisma.queueItem.findFirst({
        where: { id: createCommentDto.queueItemId },
      });

      if (!queueItem) {
        throw new NotFoundException('Queue item not found');
      }

      const comment = await this.prisma.comment.create({
        data: {
          content: createCommentDto.content,
          userId,
          queueItemId: createCommentDto.queueItemId,
        },
        include: {
          user: {
            select: { id: true, username: true },
          },
        },
      });

      return comment;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new HttpException('Failed to add comment', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Gets comments for a queue item
   */
  async getComments(queueItemId: string) {
    try {
      const comments = await this.prisma.comment.findMany({
        where: { queueItemId },
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, username: true },
          },
        },
      });

      return comments;
    } catch (error) {
      throw new HttpException('Failed to fetch comments', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Validates YouTube video ID format
   */
  private isValidYoutubeId(videoId: string): boolean {
    return /^[a-zA-Z0-9_-]{11}$/.test(videoId);
  }
}