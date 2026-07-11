import { IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateItemDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  rarity: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  dropRate: number;
}

export class UpdateItemDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  rarity?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  dropRate?: number;
}
