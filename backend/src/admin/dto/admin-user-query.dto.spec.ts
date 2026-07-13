import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { AdminUserQueryDto } from './admin-user-query.dto';

describe('AdminUserQueryDto', () => {
  it('passes validation with defaults', async () => {
    const dto = plainToInstance(AdminUserQueryDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.limit).toBe(20);
  });

  it('passes validation with all fields', async () => {
    const dto = plainToInstance(AdminUserQueryDto, {
      cursor: 'abc',
      limit: 10,
      email: 'test@test.com',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('fails when limit is less than 1', async () => {
    const dto = plainToInstance(AdminUserQueryDto, { limit: 0 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when limit exceeds 100', async () => {
    const dto = plainToInstance(AdminUserQueryDto, { limit: 101 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
