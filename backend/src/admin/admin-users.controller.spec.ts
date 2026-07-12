import { AdminUsersController } from './admin-users.controller';

describe('AdminUsersController', () => {
  let usersService: any;
  let controller: AdminUsersController;

  beforeEach(() => {
    usersService = {
      list: jest.fn(),
      getDetail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    controller = new AdminUsersController(usersService);
  });

  it('delegates list to usersService', async () => {
    const result = { items: [], nextCursor: null };
    usersService.list.mockResolvedValue(result);

    const res = await controller.list({ limit: 20 } as any);

    expect(res).toEqual(result);
    expect(usersService.list).toHaveBeenCalledWith({ limit: 20 });
  });

  it('delegates detail to usersService', async () => {
    const user = { id: 'u1', email: 'test@test.com' };
    usersService.getDetail.mockResolvedValue(user);

    const res = await controller.detail('u1');

    expect(res).toEqual(user);
    expect(usersService.getDetail).toHaveBeenCalledWith('u1');
  });

  it('delegates create to usersService', async () => {
    const created = { id: 'u1', email: 'new@test.com' };
    usersService.create.mockResolvedValue(created);

    const dto = { email: 'new@test.com', password: 'password123' } as any;
    const res = await controller.create(dto);

    expect(res).toEqual(created);
    expect(usersService.create).toHaveBeenCalledWith(dto);
  });

  it('delegates update to usersService', async () => {
    const updated = { id: 'u1', coins: 999 };
    usersService.update.mockResolvedValue(updated);

    const res = await controller.update('u1', { coins: 999 } as any);

    expect(res).toEqual(updated);
    expect(usersService.update).toHaveBeenCalledWith('u1', { coins: 999 });
  });
});
