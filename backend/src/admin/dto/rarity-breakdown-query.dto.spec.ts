import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RarityBreakdownQueryDto } from './rarity-breakdown-query.dto';

describe('RarityBreakdownQueryDto', () => {
  it('passes validation with no eventId (all-time, all events)', async () => {
    const dto = plainToInstance(RarityBreakdownQueryDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('passes validation with a valid eventId', async () => {
    const dto = plainToInstance(RarityBreakdownQueryDto, {
      eventId: '550e8400-e29b-41d4-a716-446655440000',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('fails when eventId is not a valid UUID', async () => {
    const dto = plainToInstance(RarityBreakdownQueryDto, {
      eventId: 'not-a-uuid',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
