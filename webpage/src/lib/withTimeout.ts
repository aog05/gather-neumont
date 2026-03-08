export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const seconds = Math.max(1, Math.round(timeoutMs / 1000));

    const timerId = setTimeout(() => {
      if (settled) return;
      settled = true;
      const timeoutError = new Error(
        `${label} timed out after ${seconds}s. It may still finish in the background. Please refresh and verify before retrying.`
      );
      timeoutError.name = "TimeoutError";
      reject(timeoutError);
    }, timeoutMs);

    promise.then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timerId);
        resolve(value);
      },
      (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timerId);
        reject(error);
      }
    );
  });
}
