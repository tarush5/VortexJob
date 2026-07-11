import { RetryStrategy } from '../types';

export class RetryService {
  /**
   * Calculate the delay in milliseconds before the next retry attempt.
   */
  calculateDelay(strategy: RetryStrategy, attempt: number, initialDelayMs: number, backoffFactor: number): number {
    switch (strategy) {
      case 'fixed':
        return initialDelayMs;
      case 'linear':
        return initialDelayMs * attempt;
      case 'exponential':
        return initialDelayMs * Math.pow(backoffFactor, attempt - 1);
      default:
        return initialDelayMs;
    }
  }

  /**
   * Calculate the next run_at timestamp based on the retry strategy.
   */
  calculateNextRunAt(strategy: RetryStrategy, attempt: number, initialDelayMs: number, backoffFactor: number): string {
    const delayMs = this.calculateDelay(strategy, attempt, initialDelayMs, backoffFactor);
    const nextRunAt = new Date(Date.now() + delayMs);
    return nextRunAt.toISOString();
  }
}

export const retryService = new RetryService();
