import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { Role } from '../../generated/prisma';

const BCRYPT_ROUNDS = 10;
// 32 random bytes → 64 hex chars, safely under bcrypt's 72-byte input cap.
const REFRESH_TOKEN_BYTES = 32;
const DEFAULT_REFRESH_EXPIRES_SECONDS = 604_800; // 7 days

interface TokenUser {
  id: string;
  email: string;
  role: Role;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    // `coins` defaults to 500 at the schema level — the starting bonus is not duplicated here.
    const user = await this.prisma.user.create({
      data: { email: dto.email, passwordHash },
    });

    const tokens = await this.issueTokens(user);
    return {
      user: { id: user.id, email: user.email, coins: user.coins },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.isBanned) {
      throw new UnauthorizedException('This account has been banned');
    }
    return this.issueTokens(user);
  }

  // Rotating refresh: every successful refresh mints a new pair and overwrites
  // the stored hash, so a previously-used (or leaked-then-rotated) token fails.
  async refresh(dto: RefreshDto) {
    const separator = dto.refreshToken.indexOf('.');
    if (separator === -1) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const userId = dto.refreshToken.slice(0, separator);
    const secret = dto.refreshToken.slice(separator + 1);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.isBanned) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (!user.refreshTokenHash || !user.refreshTokenExpiresAt) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (user.refreshTokenExpiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (!(await bcrypt.compare(secret, user.refreshTokenHash))) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.issueTokens(user);
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null, refreshTokenExpiresAt: null },
    });
    return { success: true };
  }

  private async issueTokens(user: TokenUser) {
    const token = this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    // Opaque secret prefixed with the user id so `refresh` can locate the row
    // without a reversible lookup — only the bcrypt hash of the secret is stored.
    const secret = randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const expiresInSeconds = parseInt(
      this.config.get<string>(
        'REFRESH_TOKEN_EXPIRES_IN_SECONDS',
        String(DEFAULT_REFRESH_EXPIRES_SECONDS),
      ),
      10,
    );
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenHash: await bcrypt.hash(secret, BCRYPT_ROUNDS),
        refreshTokenExpiresAt: new Date(Date.now() + expiresInSeconds * 1000),
      },
    });

    return { token, refreshToken: `${user.id}.${secret}` };
  }
}
