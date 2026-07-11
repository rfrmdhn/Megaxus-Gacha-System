import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateItemDto, UpdateItemDto } from './item.dto';

describe('CreateItemDto', () => {
  it('passes validation with valid data', async () => {
    const dto = plainToInstance(CreateItemDto, {
      name: 'Sword',
      rarity: 'rare',
      dropRate: 50,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('fails when name is empty', async () => {
    const dto = plainToInstance(CreateItemDto, {
      name: '',
      rarity: 'rare',
      dropRate: 50,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when dropRate exceeds 100', async () => {
    const dto = plainToInstance(CreateItemDto, {
      name: 'Sword',
      rarity: 'rare',
      dropRate: 101,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when dropRate is negative', async () => {
    const dto = plainToInstance(CreateItemDto, {
      name: 'Sword',
      rarity: 'rare',
      dropRate: -1,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('UpdateItemDto', () => {
  it('passes validation with partial data', async () => {
    const dto = plainToInstance(UpdateItemDto, { name: 'Updated Sword' });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('passes validation with empty object', async () => {
    const dto = plainToInstance(UpdateItemDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('fails when dropRate exceeds 100', async () => {
    const dto = plainToInstance(UpdateItemDto, { dropRate: 101 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
