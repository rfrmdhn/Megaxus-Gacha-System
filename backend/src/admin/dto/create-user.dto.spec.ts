jest.mock('../../../../generated/prisma', () => ({
  Role: { admin: 'admin', user: 'user' },
}), { virtual: true });

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateUserDto } from './create-user.dto';

describe('CreateUserDto', () => {
  it('passes validation with just email and password', async () => {
    const dto = plainToInstance(CreateUserDto, { email: 'user@test.com', password: 'password1' });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('passes validation with optional role and coins', async () => {
    const dto = plainToInstance(CreateUserDto, {
      email: 'user@test.com',
      password: 'password1',
      role: 'admin',
      coins: 1000,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('fails when email is invalid', async () => {
    const dto = plainToInstance(CreateUserDto, { email: 'not-an-email', password: 'password1' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when password is too short', async () => {
    const dto = plainToInstance(CreateUserDto, { email: 'user@test.com', password: 'short' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when coins is negative', async () => {
    const dto = plainToInstance(CreateUserDto, { email: 'user@test.com', password: 'password1', coins: -1 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
