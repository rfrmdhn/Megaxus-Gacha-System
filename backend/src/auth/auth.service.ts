import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    // `coins` defaults to 500 at the schema level — the starting bonus is not duplicated here.
    const user = await this.prisma.user.create({
      data: { email: dto.email, passwordHash },
    });

    return {
      user: { id: user.id, email: user.email, coins: user.coins },
      token: this.signToken(user.id, user.email, user.role),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.isBanned) {
      throw new UnauthorizedException('This account has been banned');
    }
    return { token: this.signToken(user.id, user.email, user.role) };
  }

  private signToken(sub: string, email: string, role: string) {
    return this.jwt.sign({ sub, email, role });
  }
}
