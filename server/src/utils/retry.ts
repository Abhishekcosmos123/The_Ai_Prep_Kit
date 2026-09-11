export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  options: {
    maxAttempts?: number;
    baseDelayMs?: number;
    shouldRetry?: (error: unknown, attempt: number) => boolean;
    onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
  } = {}
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 500;
  const shouldRetry =
    options.shouldRetry ??
    ((error: unknown) => {
      const message = error instanceof Error ? error.message.toLowerCase() : String(error);
      return (
        message.includes("timeout") ||
        message.includes("rate") ||
        message.includes("429") ||
        message.includes("503") ||
        message.includes("econnreset") ||
        message.includes("fetch failed") ||
        message.includes("temporarily")
      );
    });

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts || !shouldRetry(error, attempt)) {
        throw error;
      }
      const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
      options.onRetry?.(error, attempt, delayMs);
      await sleep(delayMs);
    }
  }
  throw lastError;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
