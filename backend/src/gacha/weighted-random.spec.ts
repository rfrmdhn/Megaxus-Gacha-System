import { pickWeightedRandom } from './weighted-random';

describe('pickWeightedRandom', () => {
  it('throws on an empty item list', () => {
    expect(() => pickWeightedRandom([])).toThrow();
  });

  it('always returns the sole item when there is only one', () => {
    const items = [{ id: 'a', dropRate: 100 }];
    for (let i = 0; i < 100; i++) {
      expect(pickWeightedRandom(items).id).toBe('a');
    }
  });

  it('converges to configured drop rates over many trials', () => {
    const items = [
      { id: 'legendary', dropRate: 1 },
      { id: 'rare', dropRate: 19 },
      { id: 'common', dropRate: 80 },
    ];
    const TRIALS = 200_000;
    const counts: Record<string, number> = { legendary: 0, rare: 0, common: 0 };

    for (let i = 0; i < TRIALS; i++) {
      counts[pickWeightedRandom(items).id]++;
    }

    // Tolerance is an absolute 1 percentage point to keep the test reliably
    // non-flaky at 200k trials while still catching a materially broken distribution.
    const TOLERANCE = 0.01;
    expect(Math.abs(counts.legendary / TRIALS - 0.01)).toBeLessThan(TOLERANCE);
    expect(Math.abs(counts.rare / TRIALS - 0.19)).toBeLessThan(TOLERANCE);
    expect(Math.abs(counts.common / TRIALS - 0.8)).toBeLessThan(TOLERANCE);
  });

  it('falls back to the last item when roll equals totalWeight (floating-point edge case)', () => {
    const items = [
      { id: 'first', dropRate: 50 },
      { id: 'last', dropRate: 50 },
    ];
    jest.spyOn(Math, 'random').mockReturnValue(1);
    try {
      expect(pickWeightedRandom(items).id).toBe('last');
    } finally {
      jest.restoreAllMocks();
    }
  });

  it('never returns an item with 0% drop rate', () => {
    const items = [
      { id: 'never', dropRate: 0 },
      { id: 'always', dropRate: 100 },
    ];
    for (let i = 0; i < 1000; i++) {
      expect(pickWeightedRandom(items).id).toBe('always');
    }
  });
});
