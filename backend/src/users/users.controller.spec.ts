import { UsersController } from './users.controller';

describe('UsersController', () => {
  let usersService: any;
  let controller: UsersController;

  beforeEach(() => {
    usersService = {
      getProfile: jest.fn(),
      getHistory: jest.fn(),
    };
    controller = new UsersController(usersService);
  });

  it('delegates getProfile to usersService', async () => {
    const profile = { id: 'u1', email: 'test@test.com', coins: 500 };
    usersService.getProfile.mockResolvedValue(profile);

    const result = await controller.getProfile({ id: 'u1' } as any);

    expect(result).toEqual(profile);
    expect(usersService.getProfile).toHaveBeenCalledWith('u1');
  });

  it('delegates getHistory to usersService', async () => {
    const history = { items: [], nextCursor: null };
    usersService.getHistory.mockResolvedValue(history);

    const result = await controller.getHistory({ id: 'u1' } as any, { limit: 20 } as any);

    expect(result).toEqual(history);
    expect(usersService.getHistory).toHaveBeenCalledWith('u1', { limit: 20 });
  });
});
