/** Format SAN half-moves into numbered move-pair notation: `1. e4 e5 2. Nf3`. */
export function formatSans(sans: string[]): string {
  let s = "";
  for (let i = 0; i < sans.length; i++) {
    s += (i % 2 === 0 ? `${i / 2 + 1}. ` : "") + sans[i] + " ";
  }
  return s.trim();
}

/**
 * Deep-clone a Prisma result into plain JSON so it can cross the
 * server -> client component boundary (Date fields become strings).
 */
export function serialize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
