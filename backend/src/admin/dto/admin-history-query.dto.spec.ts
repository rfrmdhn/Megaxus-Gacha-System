import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { AdminHistoryQueryDto } from './admin-history-query.dto';

describe('AdminHistoryQueryDto', () => {
  it('passes validation with defaults', async () => {
    const dto = plainToInstance(AdminHistoryQueryDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.limit).toBe(20);
  });

  it('passes validation with valid userId', async () => {
    const dto = plainToInstance(AdminHistoryQueryDto, {
      userId: '550e8400-e29b-41d4-a716-446655440000',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('fails when userId is not a valid UUID', async () => {
    const dto = plainToInstance(AdminHistoryQueryDto, { userId: 'not-a-uuid' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
