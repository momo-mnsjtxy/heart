import { beforeEach, describe, expect, it } from "vitest";
import {
  deleteAllData,
  exportAllData,
  getAllMoodEntries,
  getEncryptionStatus,
  importAllData,
  parseExportPayload,
  saveMoodEntry,
  setEncryptionPassphrase,
  clearEncryptionPassphrase,
  unlockEncryption,
  isEncryptionUnlocked,
} from "@/lib/storage";

describe("parseExportPayload", () => {
  it("accepts a valid backup shape", () => {
    const payload = parseExportPayload(
      JSON.stringify({
        sessions: [],
        moods: [{ id: "m1", mood: 3, tags: [], timestamp: 1 }],
        settings: { ephemeralMode: true },
      })
    );
    expect(payload.moods).toHaveLength(1);
    expect(payload.settings?.ephemeralMode).toBe(true);
  });

  it("rejects invalid JSON and bad shapes", () => {
    expect(() => parseExportPayload("{")).toThrow(/JSON/);
    expect(() => parseExportPayload(JSON.stringify({ moods: "nope" }))).toThrow(/数组/);
  });
});

describe("storage encryption migration and import", () => {
  beforeEach(async () => {
    await deleteAllData();
  });

  it("encrypts existing plaintext rows when enabling encryption", async () => {
    await saveMoodEntry({
      id: "mood-1",
      mood: 4,
      tags: ["平静"],
      timestamp: Date.now(),
      note: "还不错",
    });

    expect(await getEncryptionStatus()).toBe("off");
    const migrated = await setEncryptionPassphrase("test-pass-123");
    expect(migrated.moods).toBe(1);
    expect(isEncryptionUnlocked()).toBe(true);
    expect(await getEncryptionStatus()).toBe("unlocked");

    const entries = await getAllMoodEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].note).toBe("还不错");
  });

  it("decrypts rows when disabling encryption after unlock", async () => {
    await saveMoodEntry({
      id: "mood-2",
      mood: 2,
      tags: ["低落"],
      timestamp: Date.now(),
    });
    await setEncryptionPassphrase("test-pass-456");
    const migrated = await clearEncryptionPassphrase();
    expect(migrated.moods).toBe(1);
    expect(await getEncryptionStatus()).toBe("off");
    const entries = await getAllMoodEntries();
    expect(entries[0].id).toBe("mood-2");
  });

  it("rejects wrong unlock passphrase", async () => {
    await setEncryptionPassphrase("alpha-pass-000");
    await expect(unlockEncryption("wrong-password")).rejects.toThrow();
  });

  it("imports merged mood data", async () => {
    await saveMoodEntry({
      id: "keep",
      mood: 5,
      tags: [],
      timestamp: 1,
    });

    const backup = JSON.stringify({
      moods: [
        { id: "imported", mood: 1, tags: ["焦虑"], timestamp: 2 },
        { id: "keep", mood: 3, tags: ["更新"], timestamp: 3 },
      ],
    });

    const counts = await importAllData(backup, "merge");
    expect(counts.moods).toBe(2);
    const entries = await getAllMoodEntries();
    expect(entries).toHaveLength(2);
    expect(entries.find((e) => e.id === "keep")?.mood).toBe(3);
  });

  it("exports unlocked data as JSON", async () => {
    await saveMoodEntry({
      id: "export-me",
      mood: 3,
      tags: [],
      timestamp: Date.now(),
    });
    const json = await exportAllData();
    const parsed = parseExportPayload(json);
    expect(parsed.moods?.some((m) => m.id === "export-me")).toBe(true);
  });
});
