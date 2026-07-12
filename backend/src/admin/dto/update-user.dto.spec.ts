jest.mock(
  '../../../../generated/prisma',
  () => ({
    Role: { admin: 'admin', user: 'user' },
  }),
  { virtual: true },
);

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateUserDto } from './update-user.dto';

describe('UpdateUserDto', () => {
  it('passes validation with valid coins', async () => {
    const dto = plainToInstance(UpdateUserDto, { coins: 100 });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('passes validation with valid role', async () => {
    const dto = plainToInstance(UpdateUserDto, { role: 'admin' as any });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('passes validation with valid isBanned', async () => {
    const dto = plainToInstance(UpdateUserDto, { isBanned: true });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('passes validation with empty object', async () => {
    const dto = plainToInstance(UpdateUserDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('fails when coins is negative', async () => {
    const dto = plainToInstance(UpdateUserDto, { coins: -1 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when coins is not an integer', async () => {
    const dto = plainToInstance(UpdateUserDto, { coins: 1.5 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
