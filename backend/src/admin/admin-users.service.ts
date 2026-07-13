import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { User } from '../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { buildCursorArgs, paginate } from '../common/pagination';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const RECENT_HISTORY_LIMIT = 10;
const BCRYPT_ROUNDS = 10;

@Injectable()
export class AdminUsersService {
  constructor(private prisma: PrismaService) {}

  async list(query: AdminUserQueryDto) {
    const rows = await this.prisma.user.findMany({
      where: query.email
        ? { email: { contains: query.email, mode: 'insensitive' } }
        : undefined,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { gachaLogs: true } } },
      ...buildCursorArgs(query.cursor, query.limit),
    });

    const { items, nextCursor } = paginate(rows, query.limit);
    return {
      items: items.map((user) =>
        this.toUserSummary(user, user._count.gachaLogs),
      ),
      nextCursor,
    };
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        ...(dto.role !== undefined ? { role: dto.role } : {}),
        ...(dto.coins !== undefined ? { coins: dto.coins } : {}),
      },
    });

    return this.toUserSummary(user, 0);
  }

  async getDetail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { _count: { select: { gachaLogs: true } } },
    });
    if (!user) throw new NotFoundException('User not found');

    const recentHistory = await this.prisma.gachaLog.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: RECENT_HISTORY_LIMIT,
      include: {
        item: { select: { name: true, rarity: true } },
        event: { select: { name: true } },
      },
    });

    return {
      ...this.toUserSummary(user, user._count.gachaLogs),
      recentHistory: recentHistory.map((log) => ({
        id: log.id,
        eventName: log.event.name,
        itemName: log.item.name,
        rarity: log.item.rarity,
        coinsSpent: log.coinsSpent,
        createdAt: log.createdAt,
      })),
    };
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.assertExists(id);
    // Project the safe shape rather than returning the raw row — the User model
    // carries passwordHash/refreshTokenHash that must never reach the response.
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.coins !== undefined ? { coins: dto.coins } : {}),
        ...(dto.role !== undefined ? { role: dto.role } : {}),
        ...(dto.isBanned !== undefined ? { isBanned: dto.isBanned } : {}),
      },
      include: { _count: { select: { gachaLogs: true } } },
    });
    return this.toUserSummary(user, user._count.gachaLogs);
  }

  async remove(id: string) {
    await this.assertExists(id);
    // gacha_logs are the system's append-only permanent record — refuse to
    // destroy a user's history. Banning is the reversible way to disable an account.
    const pullCount = await this.prisma.gachaLog.count({
      where: { userId: id },
    });
    if (pullCount > 0) {
      throw new ConflictException(
        'User has pull history and cannot be deleted; ban the account instead',
      );
    }
    await this.prisma.user.delete({ where: { id } });
    return { success: true };
  }

  private async assertExists(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // Single source of truth for the safe, response-facing user shape — excludes
  // passwordHash/refreshTokenHash and every other internal column.
  private toUserSummary(user: User, pullCount: number) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      coins: user.coins,
      isBanned: user.isBanned,
      pullCount,
      createdAt: user.createdAt,
    };
  }
}
