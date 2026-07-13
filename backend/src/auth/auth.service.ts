import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SystemConfigService } from '../system-config/system-config.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { Role } from '../../generated/prisma';

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
    private systemConfig: SystemConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const bcryptRounds = this.systemConfig.get<number>('BCRYPT_ROUNDS');
    const passwordHash = await bcrypt.hash(dto.password, bcryptRounds);
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

    const refreshTokenBytes = this.systemConfig.get<number>(
      'REFRESH_TOKEN_BYTES',
    );
    const bcryptRounds = this.systemConfig.get<number>('BCRYPT_ROUNDS');
    const expiresInSeconds = this.systemConfig.get<number>(
      'DEFAULT_REFRESH_EXPIRES_SECONDS',
    );

    const secret = randomBytes(refreshTokenBytes).toString('hex');
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenHash: await bcrypt.hash(secret, bcryptRounds),
        refreshTokenExpiresAt: new Date(Date.now() + expiresInSeconds * 1000),
      },
    });

    return { token, refreshToken: `${user.id}.${secret}` };
  }
}
