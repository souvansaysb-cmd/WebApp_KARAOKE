import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { QueueService } from './queue.service';
import { Logger, UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { CreateVoteDto } from './dto/create-vote.dto';
import { CreateCommentDto } from './dto/create-comment.dto';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/',
})
export class QueueGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private server!: Server;
  private logger = new Logger(QueueGateway.name);

  constructor(private readonly queueService: QueueService, private readonly wsJwtGuard: WsJwtGuard) {}

  afterInit(server: Server) {
    this.server = server;
    this.logger.log('Queue WebSocket gateway initialized');
  }

  async handleConnection(client: Socket) {
    // Authenticate the connection
    try {
      const context = {
        switchToWs: () => ({
          getClient: () => client,
        }),
        getType: () => 'ws',
        getClass: () => QueueGateway,
        getHandler: () => ({} as any),
      } as any;

      await this.wsJwtGuard.canActivate(context);
      this.logger.log(`Client connected: ${client.id}`);

      // Send initial queue state
      const state = await this.queueService.getQueueState();
      client.emit('queue_initialized', state);
    } catch (error) {
      this.logger.warn(`Client rejected: ${client.id}`);
      client.emit('unauthorized', { message: 'Invalid or expired token' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('queue_updated')
  async onQueueUpdated(@ConnectedSocket() client: Socket) {
    this.logger.log(`Queue update requested by ${client.id}`);
    const queueState = await this.queueService.getQueueState();
    this.server.emit('queue_updated', queueState);
  }

  @SubscribeMessage('vote_added')
  async onVoteAdded(
    @MessageBody() data: CreateVoteDto,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`Vote received on queue item: ${data.queueItemId}`);

    // Process vote via service
    const user = (client as any).user;
    if (!user) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    try {
      await this.queueService.addVote(data, user.id);
      const queueState = await this.queueService.getQueueState();
      this.server.emit('queue_updated', queueState);
    } catch (error) {
      this.logger.error(`Vote failed: ${(error as Error).message}`);
      client.emit('error', { message: (error as Error).message });
    }
  }

  @SubscribeMessage('comment_added')
  async onCommentAdded(
    @MessageBody() data: CreateCommentDto,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`Comment received on queue item: ${data.queueItemId}`);

    const user = (client as any).user;
    if (!user) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    try {
      const comment = await this.queueService.addComment(data, user.id);
      this.server.emit(`comments_updated_${data.queueItemId}`, comment);
    } catch (error) {
      this.logger.error(`Comment failed: ${(error as Error).message}`);
      client.emit('error', { message: (error as Error).message });
    }
  }

  @SubscribeMessage('video_status_changed')
  async onVideoStatusChanged(
    @MessageBody() data: { videoId: string; status: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`Video status changed: ${data.videoId} -> ${data.status}`);

    const queueState = await this.queueService.getQueueState();
    this.server.emit('queue_updated', queueState);
  }

  async broadcastQueueUpdate() {
    const queueState = await this.queueService.getQueueState();
    this.server.emit('queue_updated', queueState);
  }
}