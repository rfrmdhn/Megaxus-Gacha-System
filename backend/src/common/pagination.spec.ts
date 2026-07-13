import { buildCursorArgs, paginate } from './pagination';

describe('buildCursorArgs', () => {
  it('takes limit + 1 and omits cursor args on the first page', () => {
    expect(buildCursorArgs(undefined, 20)).toEqual({ take: 21 });
  });

  it('adds cursor + skip:1 when a cursor is supplied', () => {
    expect(buildCursorArgs('row-5', 10)).toEqual({
      take: 11,
      cursor: { id: 'row-5' },
      skip: 1,
    });
  });
});

describe('paginate', () => {
  const rows = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('returns all rows and a null cursor when there is no next page', () => {
    expect(paginate(rows, 3)).toEqual({ items: rows, nextCursor: null });
  });

  it('trims the extra row and returns its predecessor as the next cursor', () => {
    // limit=2 with 3 rows means there is a next page; the 3rd row is the probe.
    expect(paginate(rows, 2)).toEqual({
      items: [{ id: 'a' }, { id: 'b' }],
      nextCursor: 'b',
    });
  });

  it('handles an empty result set', () => {
    expect(paginate([], 20)).toEqual({ items: [], nextCursor: null });
  });
});
