import { IsInt, IsUUID, Max, Min } from 'class-validator';

export class PullBulkDto {
  @IsUUID()
  eventId: string;

  @IsInt()
  @Min(1)
  @Max(100)
  count: number;
}
