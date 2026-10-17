const LETTERS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const ALPHABET = `${LETTERS}0123456789`;

function cyrb53(input: string, seed: number): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

export interface Namer {
  (className: string): string;
}

export function createNamer(options: { prefix: string; length: number; seed: string }): Namer {
  const { prefix, length, seed } = options;
  const letterFirst = prefix === "" || prefix === "-";
  const cache = new Map<string, string>();

  return (className) => {
    let name = cache.get(className);
    if (name !== undefined) return name;

    const input = `${seed}\u0000${className}`;
    let out = prefix;
    let round = 0;
    let h = cyrb53(input, round);
    for (let i = 0; i < length; i++) {
      if (i > 0 && i % 8 === 0) h = cyrb53(input, ++round);
      if (i === 0 && letterFirst) {
        out += LETTERS[h % LETTERS.length];
        h = Math.floor(h / LETTERS.length);
      } else {
        out += ALPHABET[h % ALPHABET.length];
        h = Math.floor(h / ALPHABET.length);
      }
    }
    cache.set(className, out);
    return out;
  };
}

export function combinedName(name: Namer, classes: Iterable<string>): string {
  const unique = [...new Set(classes)].toSorted();
  return name(unique.join(" "));
}
