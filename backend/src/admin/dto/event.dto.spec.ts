import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateEventDto, UpdateEventDto } from './event.dto';

describe('CreateEventDto', () => {
  it('passes validation with valid data', async () => {
    const dto = plainToInstance(CreateEventDto, {
      name: 'Spring Event',
      startsAt: '2026-01-01T00:00:00.000Z',
      endsAt: '2026-02-01T00:00:00.000Z',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('fails when name is empty', async () => {
    const dto = plainToInstance(CreateEventDto, {
      name: '',
      startsAt: '2026-01-01T00:00:00.000Z',
      endsAt: '2026-02-01T00:00:00.000Z',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when startsAt is not a valid date string', async () => {
    const dto = plainToInstance(CreateEventDto, {
      name: 'Spring Event',
      startsAt: 'not-a-date',
      endsAt: '2026-02-01T00:00:00.000Z',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('UpdateEventDto', () => {
  it('passes validation with partial data', async () => {
    const dto = plainToInstance(UpdateEventDto, { name: 'Updated' });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('passes validation with isActive', async () => {
    const dto = plainToInstance(UpdateEventDto, { isActive: true });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('passes validation with empty object (all optional)', async () => {
    const dto = plainToInstance(UpdateEventDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
