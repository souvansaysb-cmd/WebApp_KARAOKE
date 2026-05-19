import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('verify')
  async verifyToken(@Body('token') token: string) {
    return this.authService.verifyFirebaseToken(token);
  }

  @Post('me')
  @UseGuards(JwtAuthGuard)
  async getMe() {
    return { success: true };
  }
}
