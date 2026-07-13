import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PullBulkDto } from './pull-bulk.dto';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('PullBulkDto', () => {
  it('passes validation with a valid UUID and count', async () => {
    const dto = plainToInstance(PullBulkDto, {
      eventId: VALID_UUID,
      count: 10,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('fails when eventId is not a valid UUID', async () => {
    const dto = plainToInstance(PullBulkDto, { eventId: 'nope', count: 1 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'eventId')).toBe(true);
  });

  it('fails when count is below the minimum of 1', async () => {
    const dto = plainToInstance(PullBulkDto, { eventId: VALID_UUID, count: 0 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'count')).toBe(true);
  });

  it('fails when count exceeds the static max of 100', async () => {
    const dto = plainToInstance(PullBulkDto, {
      eventId: VALID_UUID,
      count: 101,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'count')).toBe(true);
  });

  it('fails when count is not an integer', async () => {
    const dto = plainToInstance(PullBulkDto, {
      eventId: VALID_UUID,
      count: 2.5,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'count')).toBe(true);
  });
});
