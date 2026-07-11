import { AuthController } from './auth.controller';

describe('AuthController', () => {
  let authService: any;
  let controller: AuthController;

  beforeEach(() => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
    };
    controller = new AuthController(authService);
  });

  it('delegates register to authService', async () => {
    const dto = { email: 'test@test.com', password: 'password123' };
    authService.register.mockResolvedValue({
      user: { id: 'u1', email: 'test@test.com', coins: 500 },
      token: 'jwt-token',
    });

    const result = await controller.register(dto);

    expect(authService.register).toHaveBeenCalledWith(dto);
    expect(result.token).toBe('jwt-token');
  });

  it('delegates login to authService', async () => {
    const dto = { email: 'test@test.com', password: 'password123' };
    authService.login.mockResolvedValue({ token: 'jwt-token' });

    const result = await controller.login(dto);

    expect(authService.login).toHaveBeenCalledWith(dto);
    expect(result.token).toBe('jwt-token');
  });
});
