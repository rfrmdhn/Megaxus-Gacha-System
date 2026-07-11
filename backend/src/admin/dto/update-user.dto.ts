import { IsBoolean, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { Role } from '../../../generated/prisma';

export class UpdateUserDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  coins?: number;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsBoolean()
  isBanned?: boolean;
}
