import { sleep } from "./retry.js";

/**
 * Simple token-bucket style min-interval throttler for free-tier APIs.
 */
export class RateLimiter {
  private lastRun = 0;
  private chain: Promise<void> = Promise.resolve();

  constructor(private readonly minIntervalMs: number) {}

  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.chain.then(async () => {
      const now = Date.now();
      const wait = Math.max(0, this.minIntervalMs - (now - this.lastRun));
      if (wait > 0) await sleep(wait);
      this.lastRun = Date.now();
      return fn();
    });
    this.chain = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }
}
