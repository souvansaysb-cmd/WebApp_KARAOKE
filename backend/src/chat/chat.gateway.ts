import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { Logger } from '@nestjs/common';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private server!: Server;
  private logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly wsJwtGuard: WsJwtGuard,
  ) {}

  afterInit(server: Server) {
    this.server = server;
    this.logger.log('Chat WebSocket gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      // Authenticate the connection
      const context = {
        switchToWs: () => ({
          getClient: () => client,
        }),
        getType: () => 'ws',
        getClass: () => ChatGateway,
        getHandler: () => ({} as any),
      } as any;

      await this.wsJwtGuard.canActivate(context);
      this.logger.log(`Chat client connected: ${client.id}`);

      // Send initial chat history (last 50 messages, oldest first)
      const messages = await this.chatService.getMessages(50);
      client.emit('chat_initialized', messages);
    } catch (error) {
      this.logger.warn(`Chat client rejected: ${client.id}`);
      client.emit('unauthorized', { message: 'Invalid or expired token' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Chat client disconnected: ${client.id}`);
  }

  /**
   * Handle new chat message from client
   */
  @SubscribeMessage('send_message')
  async handleMessage(
    @MessageBody() data: { content: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = (client as any).user;
    if (!user) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    if (!data.content || data.content.trim().length === 0) {
      client.emit('error', { message: 'Message cannot be empty' });
      return;
    }

    try {
      const message = await this.chatService.sendMessage(data.content.trim(), user.id);

      // Broadcast to ALL clients in the chat namespace
      this.server.emit('message_added', message);
    } catch (error) {
      this.logger.error(`Failed to send message: ${(error as Error).message}`);
      client.emit('error', { message: 'Failed to send message' });
    }
  }
}