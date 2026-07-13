import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateEventDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsDateString()
  startsAt: string;

  @IsDateString()
  endsAt: string;
}

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
