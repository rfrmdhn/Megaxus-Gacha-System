import { IsOptional, IsUUID } from 'class-validator';
import { HistoryQueryDto } from '../../users/dto/history-query.dto';

export class AdminHistoryQueryDto extends HistoryQueryDto {
  @IsOptional()
  @IsUUID()
  userId?: string;
}
