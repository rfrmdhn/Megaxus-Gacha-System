import { IsUUID } from 'class-validator';

export class PullDto {
  @IsUUID()
  eventId: string;
}
