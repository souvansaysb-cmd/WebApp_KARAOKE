import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import type { DecodedIdToken } from 'firebase-admin/auth';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async verifyFirebaseToken(token: string) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      return this.syncUser(decodedToken);
    } catch (error) {
      throw new UnauthorizedException('Invalid Firebase token');
    }
  }

  private async syncUser(firebaseUser: DecodedIdToken) {
    const { uid, email, displayName } = firebaseUser;

    let user = await this.prisma.user.findUnique({
      where: { firebaseId: uid },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          firebaseId: uid,
          email: email || 'unknown',
          username: displayName,
          role: 'USER',
        },
      });
    } else {
      // Sync latest metadata from Firebase to keep local DB up to date
      user = await this.prisma.user.update({
        where: { firebaseId: uid },
        data: {
          email: email || user.email,
          username: displayName || user.username,
        },
      });
    }

    return this.generateLocalToken(user);
  }

  private generateLocalToken(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }
}
