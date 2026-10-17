import { describe, expect, test } from "bun:test";

import { createNamer } from "../src/hash.ts";

describe("createNamer", () => {
  const name = createNamer({ prefix: "", length: 6, seed: "" });

  test("is deterministic across instances", () => {
    const again = createNamer({ prefix: "", length: 6, seed: "" });
    expect(name("flex")).toBe(again("flex"));
  });

  test("produces valid identifiers that start with a letter", () => {
    for (const cls of ["flex", "p-4", "hover:bg-red-500", "sm:p-[3px]", "group"]) {
      expect(name(cls)).toMatch(/^[A-Za-z][A-Za-z0-9]{5}$/);
    }
  });

  test("applies prefix and length", () => {
    const prefixed = createNamer({ prefix: "tc_", length: 8, seed: "" });
    expect(prefixed("flex")).toMatch(/^tc_[A-Za-z0-9]{8}$/);
  });

  test("seed changes the output", () => {
    const seeded = createNamer({ prefix: "", length: 6, seed: "v2" });
    expect(seeded("flex")).not.toBe(name("flex"));
  });

  test("does not collide on a large class set", () => {
    const names = new Set<string>();
    const total = 20_000;
    for (let i = 0; i < total; i++) names.add(name(`cls-${i}`));
    expect(names.size).toBe(total);
  });
});
