import { UnauthorizedException } from '@nestjs/common';
import { of } from 'rxjs';
import { AdminHistoryController } from './admin-history.controller';

describe('AdminHistoryController#stream', () => {
  let historyService: any;
  let adminFeed: any;
  let jwtService: any;
  let prisma: any;
  let controller: AdminHistoryController;

  beforeEach(() => {
    historyService = { list: jest.fn() };
    adminFeed = { stream: jest.fn().mockReturnValue(of()) };
    jwtService = { verify: jest.fn() };
    prisma = { user: { findUnique: jest.fn() } };
    controller = new AdminHistoryController(
      historyService,
      adminFeed,
      jwtService,
      prisma,
    );
  });

  it('rejects an invalid or expired token', async () => {
    jwtService.verify.mockImplementation(() => {
      throw new Error('jwt expired');
    });

    await expect(controller.stream('bad-token')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejects when the token subject no longer exists', async () => {
    jwtService.verify.mockReturnValue({ sub: 'deleted-user' });
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(controller.stream('token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a banned admin even with a still-valid token (re-checks DB, not the token claim)', async () => {
    jwtService.verify.mockReturnValue({ sub: 'admin-1', role: 'admin' });
    prisma.user.findUnique.mockResolvedValue({ role: 'admin', isBanned: true });

    await expect(controller.stream('token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a user demoted from admin after the token was issued', async () => {
    jwtService.verify.mockReturnValue({ sub: 'user-1', role: 'admin' });
    prisma.user.findUnique.mockResolvedValue({ role: 'user', isBanned: false });

    await expect(controller.stream('token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('returns the admin feed stream for a valid, non-banned admin', async () => {
    jwtService.verify.mockReturnValue({ sub: 'admin-1', role: 'admin' });
    prisma.user.findUnique.mockResolvedValue({
      role: 'admin',
      isBanned: false,
    });

    const result = await controller.stream('token');

    expect(result).toBe(adminFeed.stream.mock.results[0].value);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'admin-1' },
      select: { role: true, isBanned: true },
    });
  });
});
