import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let prisma: any;
  let config: any;
  let strategy: JwtStrategy;

  beforeEach(() => {
    prisma = { user: { findUnique: jest.fn() } };
    config = { getOrThrow: jest.fn().mockReturnValue('test-secret') };
    strategy = new JwtStrategy(config, prisma);
  });

  it('throws UnauthorizedException when user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      strategy.validate({
        sub: 'missing-user',
        email: 'test@test.com',
        role: 'user',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when user is banned', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'test@test.com',
      role: 'user',
      isBanned: true,
    });

    await expect(
      strategy.validate({ sub: 'u1', email: 'test@test.com', role: 'user' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('returns authenticated user when user exists and is not banned', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'test@test.com',
      role: 'admin',
      isBanned: false,
    });

    const result = await strategy.validate({
      sub: 'u1',
      email: 'test@test.com',
      role: 'admin',
    });

    expect(result).toEqual({ id: 'u1', email: 'test@test.com', role: 'admin' });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'u1' },
      select: { id: true, email: true, role: true, isBanned: true },
    });
  });
});
