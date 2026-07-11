export interface WeightedItem {
  id: string;
  dropRate: number;
}

/**
 * Linear prefix-sum weighted random selection. dropRate is a percentage (0-100);
 * items are expected to sum to 100 for a given event (enforced at write time).
 */
export function pickWeightedRandom<T extends WeightedItem>(items: T[]): T {
  if (items.length === 0) {
    throw new Error('Cannot pick a weighted random item from an empty list');
  }

  const totalWeight = items.reduce((sum, item) => sum + item.dropRate, 0);
  const roll = Math.random() * totalWeight;

  let cumulative = 0;
  for (const item of items) {
    cumulative += item.dropRate;
    if (roll < cumulative) return item;
  }

  // Floating point edge case (roll landed exactly on totalWeight): fall back to the last item.
  return items[items.length - 1];
}
