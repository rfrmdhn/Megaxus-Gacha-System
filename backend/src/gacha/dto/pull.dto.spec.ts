import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PullDto } from './pull.dto';

describe('PullDto', () => {
  it('passes validation with a valid UUID', async () => {
    const dto = plainToInstance(PullDto, {
      eventId: '550e8400-e29b-41d4-a716-446655440000',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('fails when eventId is not a valid UUID', async () => {
    const dto = plainToInstance(PullDto, { eventId: 'not-a-uuid' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
