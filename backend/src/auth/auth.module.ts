import { Module, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthController } from './auth.controller';

const logger = new Logger('AuthModule');
const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  logger.warn('JWT_SECRET is not defined in environment variables. Using a fallback insecure secret. PLEASE SET THIS IN PRODUCTION!');
}

@Module({
  imports: [
    JwtModule.register({
      secret: jwtSecret || 'dev-insecure-secret-key',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  providers: [AuthService, PrismaService, JwtAuthGuard, WsJwtGuard, RolesGuard],
  exports: [AuthService, JwtAuthGuard, WsJwtGuard, RolesGuard, JwtModule, PrismaService],
  controllers: [AuthController],
})
export class AuthModule {}