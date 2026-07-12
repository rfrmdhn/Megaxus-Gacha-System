import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let prisma: any;
  let jwt: any;
  let service: AuthService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    jwt = { sign: jest.fn().mockReturnValue('jwt-token') };
    service = new AuthService(prisma, jwt);
  });

  describe('register', () => {
    it('throws ConflictException when email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'existing',
        email: 'test@test.com',
      });

      await expect(
        service.register({ email: 'test@test.com', password: 'password123' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('creates a user and returns user + token on success', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'new-user',
        email: 'new@test.com',
        coins: 500,
        role: 'user',
      });

      const result = await service.register({
        email: 'new@test.com',
        password: 'password123',
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'new@test.com',
          passwordHash: expect.any(String),
        },
      });
      expect(result.user).toEqual({
        id: 'new-user',
        email: 'new@test.com',
        coins: 500,
      });
      expect(result.token).toBe('jwt-token');
      expect(jwt.sign).toHaveBeenCalledWith({
        sub: 'new-user',
        email: 'new@test.com',
        role: 'user',
      });
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'bad@test.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'test@test.com',
        passwordHash: '$2b$10$invalidhash',
        isBanned: false,
        role: 'user',
      });

      await expect(
        service.login({ email: 'test@test.com', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user is banned', async () => {
      // Use a real bcrypt hash of 'password123'
      const bcrypt = require('bcrypt');
      const hash = bcrypt.hashSync('password123', 2);
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'test@test.com',
        passwordHash: hash,
        isBanned: true,
        role: 'user',
      });

      await expect(
        service.login({ email: 'test@test.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns token on successful login', async () => {
      const bcrypt = require('bcrypt');
      const hash = bcrypt.hashSync('password123', 2);
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'test@test.com',
        passwordHash: hash,
        isBanned: false,
        role: 'user',
      });

      const result = await service.login({
        email: 'test@test.com',
        password: 'password123',
      });

      expect(result.token).toBe('jwt-token');
      expect(jwt.sign).toHaveBeenCalledWith({
        sub: 'u1',
        email: 'test@test.com',
        role: 'user',
      });
    });
  });
});
