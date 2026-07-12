import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { Role } from '../../../generated/prisma';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @MinLength(8)
  password: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2147483647)
  coins?: number;
}
