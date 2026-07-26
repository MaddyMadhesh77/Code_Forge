import { describe, expect, it } from "vitest";

import { hashPassword, needsRehash, verifyPassword } from "./password.js";

describe("password hashing", () => {
  it("produces a self-describing scrypt hash, not the plaintext", async () => {
    const hash = await hashPassword("correct horse battery staple");

    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(hash).not.toContain("correct horse battery staple");
    // The old implementation stored `hashed:${password}`, which is plaintext
    // with a prefix. Guard against any regression to that shape.
    expect(hash).not.toMatch(/^hashed:/);
  });

  it("salts each hash, so identical passwords differ on disk", async () => {
    const [a, b] = await Promise.all([hashPassword("same-password"), hashPassword("same-password")]);

    expect(a).not.toBe(b);
    await expect(verifyPassword("same-password", a)).resolves.toBe(true);
    await expect(verifyPassword("same-password", b)).resolves.toBe(true);
  });

  it("accepts the correct password and rejects a wrong one", async () => {
    const hash = await hashPassword("s3cure-pa55word");

    await expect(verifyPassword("s3cure-pa55word", hash)).resolves.toBe(true);
    await expect(verifyPassword("s3cure-pa55word ", hash)).resolves.toBe(false);
    await expect(verifyPassword("S3cure-pa55word", hash)).resolves.toBe(false);
    await expect(verifyPassword("", hash)).resolves.toBe(false);
  });

  it("rejects legacy and malformed hashes instead of throwing", async () => {
    // A corrupt or legacy row must fail closed, never authenticate.
    await expect(verifyPassword("hunter2", "hashed:hunter2")).resolves.toBe(false);
    await expect(verifyPassword("hunter2", "")).resolves.toBe(false);
    await expect(verifyPassword("hunter2", "scrypt$notanumber$8$1$aaaa$bbbb")).resolves.toBe(false);
    await expect(verifyPassword("hunter2", "scrypt$16384$8$1")).resolves.toBe(false);
  });

  it("refuses absurd cost parameters that could exhaust memory", async () => {
    const hostile = `scrypt$99999999$99$99$${Buffer.from("salt").toString("base64")}$${Buffer.from(
      "key",
    ).toString("base64")}`;

    await expect(verifyPassword("anything", hostile)).resolves.toBe(false);
  });

  it("flags legacy hashes for rehash and current ones as current", async () => {
    expect(needsRehash("hashed:plaintext")).toBe(true);
    expect(needsRehash("scrypt$1024$1$1$YWJj$ZGVm")).toBe(true);
    expect(needsRehash(await hashPassword("current"))).toBe(false);
  });

  it("normalises unicode so equivalent passwords still verify", async () => {
    // U+00E9 vs U+0065 U+0301 — visually identical, different bytes.
    const hash = await hashPassword("café");
    await expect(verifyPassword("café", hash)).resolves.toBe(true);
  });
});
