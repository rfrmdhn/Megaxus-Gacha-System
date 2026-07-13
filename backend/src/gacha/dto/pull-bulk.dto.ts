import { IsInt, IsUUID, Max, Min } from 'class-validator';
import { MAX_BULK_PULL } from '../gacha.constants';

export class PullBulkDto {
  @IsUUID()
  eventId: string;

  @IsInt()
  @Min(1)
  @Max(MAX_BULK_PULL)
  count: number;
}
