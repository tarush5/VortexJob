import { describe, it, expect } from 'vitest';
import { retryService } from '../src/services/retry.service';

describe('Retry Strategies', () => {
  describe('Fixed Delay', () => {
    it('should return the same delay for all attempts', () => {
      expect(retryService.calculateDelay('fixed', 1, 1000, 2)).toBe(1000);
      expect(retryService.calculateDelay('fixed', 2, 1000, 2)).toBe(1000);
      expect(retryService.calculateDelay('fixed', 3, 1000, 2)).toBe(1000);
      expect(retryService.calculateDelay('fixed', 10, 1000, 2)).toBe(1000);
    });

    it('should respect different initial delays', () => {
      expect(retryService.calculateDelay('fixed', 1, 500, 2)).toBe(500);
      expect(retryService.calculateDelay('fixed', 5, 5000, 2)).toBe(5000);
    });
  });

  describe('Linear Backoff', () => {
    it('should increase linearly with each attempt', () => {
      expect(retryService.calculateDelay('linear', 1, 1000, 2)).toBe(1000);
      expect(retryService.calculateDelay('linear', 2, 1000, 2)).toBe(2000);
      expect(retryService.calculateDelay('linear', 3, 1000, 2)).toBe(3000);
      expect(retryService.calculateDelay('linear', 5, 1000, 2)).toBe(5000);
    });

    it('should use the initial delay as the base multiplier', () => {
      expect(retryService.calculateDelay('linear', 1, 500, 2)).toBe(500);
      expect(retryService.calculateDelay('linear', 4, 500, 2)).toBe(2000);
    });
  });

  describe('Exponential Backoff', () => {
    it('should increase exponentially with backoff factor', () => {
      // backoff_factor = 2: 1000, 2000, 4000, 8000
      expect(retryService.calculateDelay('exponential', 1, 1000, 2)).toBe(1000);
      expect(retryService.calculateDelay('exponential', 2, 1000, 2)).toBe(2000);
      expect(retryService.calculateDelay('exponential', 3, 1000, 2)).toBe(4000);
      expect(retryService.calculateDelay('exponential', 4, 1000, 2)).toBe(8000);
    });

    it('should work with different backoff factors', () => {
      // backoff_factor = 3: 1000, 3000, 9000
      expect(retryService.calculateDelay('exponential', 1, 1000, 3)).toBe(1000);
      expect(retryService.calculateDelay('exponential', 2, 1000, 3)).toBe(3000);
      expect(retryService.calculateDelay('exponential', 3, 1000, 3)).toBe(9000);
    });

    it('should handle backoff factor of 1 (constant)', () => {
      expect(retryService.calculateDelay('exponential', 1, 1000, 1)).toBe(1000);
      expect(retryService.calculateDelay('exponential', 5, 1000, 1)).toBe(1000);
    });
  });

  describe('calculateNextRunAt', () => {
    it('should return a future ISO timestamp', () => {
      const before = Date.now();
      const result = retryService.calculateNextRunAt('fixed', 1, 1000, 2);
      const after = Date.now();

      const resultTime = new Date(result).getTime();
      expect(resultTime).toBeGreaterThanOrEqual(before + 1000);
      expect(resultTime).toBeLessThanOrEqual(after + 1000 + 100); // small tolerance
    });
  });
});
