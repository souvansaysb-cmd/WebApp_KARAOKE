import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sends a chat message
   */
  async sendMessage(content: string, userId: string) {
    try {
      const message = await this.prisma.chatMessage.create({
        data: {
          content,
          userId,
        },
        include: {
          user: {
            select: { id: true, username: true },
          },
        },
      });

      return message;
    } catch (error) {
      throw new HttpException('Failed to send message', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Gets recent chat messages
   */
  async getMessages(limit: number = 50) {
    try {
      const messages = await this.prisma.chatMessage.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          user: {
            select: { id: true, username: true },
          },
        },
      });

      return messages.reverse(); // Return oldest first
    } catch (error) {
      throw new HttpException('Failed to fetch messages', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Gets messages since a certain date
   */
  async getMessagesSince(since: Date) {
    try {
      const messages = await this.prisma.chatMessage.findMany({
        where: {
          createdAt: {
            gte: since,
          },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, username: true },
          },
        },
      });

      return messages;
    } catch (error) {
      throw new HttpException('Failed to fetch messages', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
