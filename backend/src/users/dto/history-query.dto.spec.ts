import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { HistoryQueryDto } from './history-query.dto';

describe('HistoryQueryDto', () => {
  it('passes validation with defaults', async () => {
    const dto = plainToInstance(HistoryQueryDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.limit).toBe(20);
  });

  it('passes validation with cursor and limit', async () => {
    const dto = plainToInstance(HistoryQueryDto, {
      cursor: 'abc',
      limit: 10,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('fails when limit is less than 1', async () => {
    const dto = plainToInstance(HistoryQueryDto, { limit: 0 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when limit exceeds 100', async () => {
    const dto = plainToInstance(HistoryQueryDto, { limit: 101 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
