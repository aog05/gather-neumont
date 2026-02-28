export function randomSeed(): string {
  // Prefer stable, high-entropy IDs when available.
  const anyCrypto = globalThis.crypto as any;
  if (anyCrypto?.randomUUID) {
    return String(anyCrypto.randomUUID());
  }

  // Fallback: 128-bit hex from getRandomValues, or Math.random as last resort.
  if (anyCrypto?.getRandomValues) {
    const buf = new Uint8Array(16);
    anyCrypto.getRandomValues(buf);
    return Array.from(buf, (b: number) => b.toString(16).padStart(2, "0")).join("");
  }

  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

