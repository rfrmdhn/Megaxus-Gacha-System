import { BadRequestException } from '@nestjs/common';
import { assertDropRatesEqual100, assertDropRatesDoNotExceed100 } from './drop-rate.util';

describe('drop-rate.util', () => {
  describe('assertDropRatesEqual100', () => {
    it('does not throw when rates sum to exactly 100', () => {
      expect(() => assertDropRatesEqual100([50, 30, 20])).not.toThrow();
    });

    it('does not throw for a single 100% rate', () => {
      expect(() => assertDropRatesEqual100([100])).not.toThrow();
    });

    it('does not throw for decimal rates that sum to 100', () => {
      expect(() => assertDropRatesEqual100([33.33, 33.33, 33.34])).not.toThrow();
    });

    it('throws BadRequestException when rates sum to less than 100', () => {
      expect(() => assertDropRatesEqual100([50, 30])).toThrow(BadRequestException);
    });

    it('throws BadRequestException when rates sum to more than 100', () => {
      expect(() => assertDropRatesEqual100([50, 60])).toThrow(BadRequestException);
    });

    it('throws for empty rates', () => {
      expect(() => assertDropRatesEqual100([])).toThrow(BadRequestException);
    });

    it('includes the actual total in the error message', () => {
      try {
        assertDropRatesEqual100([50, 30]);
        fail('Should have thrown');
      } catch (e) {
        expect(e.message).toContain('80');
      }
    });
  });

  describe('assertDropRatesDoNotExceed100', () => {
    it('does not throw when rates sum to exactly 100', () => {
      expect(() => assertDropRatesDoNotExceed100([50, 30, 20])).not.toThrow();
    });

    it('does not throw when rates sum to less than 100', () => {
      expect(() => assertDropRatesDoNotExceed100([50, 30])).not.toThrow();
    });

    it('does not throw for empty rates', () => {
      expect(() => assertDropRatesDoNotExceed100([])).not.toThrow();
    });

    it('throws BadRequestException when rates exceed 100', () => {
      expect(() => assertDropRatesDoNotExceed100([50, 60])).toThrow(BadRequestException);
    });

    it('includes the actual total in the error message', () => {
      try {
        assertDropRatesDoNotExceed100([50, 60]);
        fail('Should have thrown');
      } catch (e) {
        expect(e.message).toContain('110');
      }
    });
  });
});
