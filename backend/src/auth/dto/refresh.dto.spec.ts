import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RefreshDto } from './refresh.dto';

describe('RefreshDto', () => {
  it('passes validation with a non-empty token', async () => {
    const dto = plainToInstance(RefreshDto, { refreshToken: 'u1.secret' });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('fails when the token is missing', async () => {
    const dto = plainToInstance(RefreshDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when the token is an empty string', async () => {
    const dto = plainToInstance(RefreshDto, { refreshToken: '' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
