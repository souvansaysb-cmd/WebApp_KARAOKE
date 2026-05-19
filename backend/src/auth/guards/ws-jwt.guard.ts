import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient<Socket>();
    const token = this.extractToken(client);

    if (!token) {
      this.logger.warn(`WebSocket connection rejected: no token (client: ${client.id})`);
      throw new WsException('Unauthorized: No token provided');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      // Attach user data to the socket for downstream use
      (client as any).user = { ...payload, id: payload.sub };
      return true;
    } catch (error) {
      this.logger.warn(`WebSocket connection rejected: invalid/expired token (client: ${client.id})`);
      throw new WsException('Unauthorized: Invalid or expired token');
    }
  }

  private extractToken(client: Socket): string | null {
    // Extract token from auth handshake
    const auth = client.handshake?.auth;
    if (auth?.token) {
      return auth.token;
    }

    // Fallback: extract from query parameter
    const query = client.handshake?.query;
    if (query?.token) {
      return query.token as string;
    }

    // Fallback: extract from Authorization header (if present in initial request)
    const headers = client.handshake?.headers;
    const authHeader = headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }
}