import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RegisterDto } from './register.dto';

describe('RegisterDto', () => {
  it('passes validation with valid data', async () => {
    const dto = plainToInstance(RegisterDto, {
      email: 'test@test.com',
      password: 'password123',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('fails when email is invalid', async () => {
    const dto = plainToInstance(RegisterDto, {
      email: 'not-an-email',
      password: 'password123',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when password is too short', async () => {
    const dto = plainToInstance(RegisterDto, {
      email: 'test@test.com',
      password: 'short',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
