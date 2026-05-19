import { Controller, Post, Get, Body, UseGuards, Req, HttpCode, Query } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsString, IsNotEmpty } from 'class-validator';

class SendMessageDto {
  @IsNotEmpty()
  @IsString()
  content: string;
}

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * Send a message
   */
  @Post()
  @HttpCode(201)
  async sendMessage(@Body() sendMessageDto: SendMessageDto, @Req() req: any) {
    return this.chatService.sendMessage(sendMessageDto.content, req.user.id);
  }

  /**
   * Get recent messages
   */
  @Get()
  async getMessages(@Query('limit') limit?: string) {
    const messageLimit = limit ? parseInt(limit, 10) : 50;
    return this.chatService.getMessages(Math.min(messageLimit, 100)); // Max 100 messages
  }

  /**
   * Get messages since a timestamp
   */
  @Get('since')
  async getMessagesSince(@Query('timestamp') timestamp?: string) {
    if (!timestamp) {
      return [];
    }
    const sinceDate = new Date(parseInt(timestamp, 10));
    return this.chatService.getMessagesSince(sinceDate);
  }
}
