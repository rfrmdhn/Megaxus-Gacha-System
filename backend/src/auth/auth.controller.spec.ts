import { AuthController } from './auth.controller';

describe('AuthController', () => {
  let authService: any;
  let controller: AuthController;

  beforeEach(() => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
    };
    controller = new AuthController(authService);
  });

  it('delegates register to authService', async () => {
    const dto = { email: 'test@test.com', password: 'password123' };
    authService.register.mockResolvedValue({
      user: { id: 'u1', email: 'test@test.com', coins: 500 },
      token: 'jwt-token',
      refreshToken: 'u1.secret',
    });

    const result = await controller.register(dto);

    expect(authService.register).toHaveBeenCalledWith(dto);
    expect(result.token).toBe('jwt-token');
  });

  it('delegates login to authService', async () => {
    const dto = { email: 'test@test.com', password: 'password123' };
    authService.login.mockResolvedValue({
      token: 'jwt-token',
      refreshToken: 'u1.secret',
    });

    const result = await controller.login(dto);

    expect(authService.login).toHaveBeenCalledWith(dto);
    expect(result.token).toBe('jwt-token');
  });

  it('delegates refresh to authService', async () => {
    const dto = { refreshToken: 'u1.secret' };
    authService.refresh.mockResolvedValue({
      token: 'new-jwt',
      refreshToken: 'u1.new-secret',
    });

    const result = await controller.refresh(dto);

    expect(authService.refresh).toHaveBeenCalledWith(dto);
    expect(result.token).toBe('new-jwt');
  });

  it('delegates logout to authService using the current user id', async () => {
    authService.logout.mockResolvedValue({ success: true });

    const result = await controller.logout({
      id: 'u1',
      email: 'test@test.com',
      role: 'user',
    } as any);

    expect(authService.logout).toHaveBeenCalledWith('u1');
    expect(result).toEqual({ success: true });
  });
});
