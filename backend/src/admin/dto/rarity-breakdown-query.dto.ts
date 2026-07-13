import { IsOptional, IsUUID } from 'class-validator';

export class RarityBreakdownQueryDto {
  @IsOptional()
  @IsUUID()
  eventId?: string;
}
