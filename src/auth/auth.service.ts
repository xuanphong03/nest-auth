import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/database/prisma.service';
import Hash from 'src/utils/hashing';
import { LoginAuthDto } from './dto/login-auth.dto';
import { RegisterAuthDto } from './dto/register-auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(body: RegisterAuthDto) {
    body.created_at = new Date();
    body.updated_at = new Date();
    body.password = Hash.make(body.password);
    const newUser = await this.prisma.user.create({
      data: body,
    });
    const tokens = await this.getTokens(newUser.id, newUser.email);
    await this.updateRtHash(newUser.id, tokens.refreshToken);
    return tokens;
  }

  async updateRtHash(userId: number, rt: string) {
    const hash = await Hash.make(rt);
    return this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        refresh_token: hash,
      },
    });
  }

  async login(body: LoginAuthDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: body.email,
      },
    });
    // const hashedPassword = user.password;
    if (!user || !Hash.verify(body.password, user.password)) {
      return false;
    }
    const tokens = await this.getTokens(user.id, user.email);
    await this.updateRtHash(user.id, tokens.refreshToken);
    return tokens;
  }

  async logout(userId: number) {
    await this.prisma.user.update({
      where: {
        id: userId,
        refresh_token: {
          not: null,
        },
      },
      data: {
        refresh_token: null,
      },
    });
  }

  async refreshTokens(userId: number, rt: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user || !Hash.verify(rt, user.refresh_token)) {
      return false;
    }

    const tokens = await this.getTokens(user.id, user.email);
    await this.updateRtHash(user.id, tokens.refreshToken);
    return tokens;
  }

  async getTokens(userId: number, email: string) {
    const [at, rt] = await Promise.all([
      this.jwt.signAsync(
        { sub: userId, email: email },
        {
          expiresIn: 60 * 60,
          secret: process.env.JWT_SECRET,
        },
      ),
      this.jwt.signAsync(
        { sub: userId, email: email },
        {
          expiresIn: 60 * 60 * 24,
          secret: process.env.JWT_RT_SECRET,
        },
      ),
    ]);

    return {
      accessToken: at,
      refreshToken: rt,
    };
  }
}
