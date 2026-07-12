import { Prisma } from '../../generated/prisma';
import { BadRequestException } from '@nestjs/common';

type Decimal = Prisma.Decimal;
const Decimal = Prisma.Decimal;

function sumOf(rates: (Decimal | number | string)[]): Decimal {
  return rates.reduce<Decimal>((sum, rate) => sum.plus(rate), new Decimal(0));
}

/**
 * Used while an event is a draft (not active): items can be added incrementally,
 * so only reject if the running total would exceed 100 — it doesn't need to hit
 * exactly 100 until the event is activated.
 */
export function assertDropRatesDoNotExceed100(
  rates: (Decimal | number | string)[],
): void {
  const total = sumOf(rates);
  if (total.greaterThan(new Decimal(100))) {
    throw new BadRequestException(
      `Drop rates for this event cannot exceed 100% (would be ${total.toString()}%)`,
    );
  }
}

/**
 * Used when activating an event, and as a pull-time defense-in-depth check:
 * an active event's items must sum to exactly 100 — no partial configuration.
 */
export function assertDropRatesEqual100(
  rates: (Decimal | number | string)[],
): void {
  const total = sumOf(rates);
  if (!total.equals(new Decimal(100))) {
    throw new BadRequestException(
      `Drop rates for this event must sum to exactly 100% (currently ${total.toString()}%)`,
    );
  }
}
