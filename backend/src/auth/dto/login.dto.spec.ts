import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { LoginDto } from './login.dto';

describe('LoginDto', () => {
  it('passes validation with valid data', async () => {
    const dto = plainToInstance(LoginDto, {
      email: 'test@test.com',
      password: 'password123',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('fails when email is invalid', async () => {
    const dto = plainToInstance(LoginDto, {
      email: 'not-an-email',
      password: 'password123',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when password is missing', async () => {
    const dto = plainToInstance(LoginDto, {
      email: 'test@test.com',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
