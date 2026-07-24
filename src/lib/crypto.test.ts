import { describe, expect, it } from "vitest";
import {
  createWrappedKey,
  unwrapDataKey,
  encryptWithKey,
  decryptWithKey,
  isEncryptedPayload,
} from "@/lib/crypto";

describe("crypto", () => {
  it("wraps and unwraps a data key with the correct passphrase", async () => {
    const { material, dataKey } = await createWrappedKey("correct-horse-battery");
    const unlocked = await unwrapDataKey("correct-horse-battery", material);
    expect(unlocked).toBeTruthy();

    const cipher = await encryptWithKey(JSON.stringify({ hello: "world" }), dataKey);
    expect(isEncryptedPayload(cipher)).toBe(true);
    const plain = await decryptWithKey(cipher, unlocked);
    expect(JSON.parse(plain)).toEqual({ hello: "world" });
  });

  it("rejects a wrong passphrase", async () => {
    const { material } = await createWrappedKey("correct-horse-battery");
    await expect(unwrapDataKey("wrong-password", material)).rejects.toThrow();
  });

  it("detects encrypted vs plaintext payloads", () => {
    expect(isEncryptedPayload(JSON.stringify({ id: "1", mood: 3 }))).toBe(false);
    expect(
      isEncryptedPayload(
        JSON.stringify({ v: "v1", salt: "abc", iv: "def", data: "xyz" })
      )
    ).toBe(true);
    expect(isEncryptedPayload("not-json")).toBe(false);
  });
});
