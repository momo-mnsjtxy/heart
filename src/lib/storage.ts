import { openDB, type IDBPDatabase } from "idb";
import type { ChatSession, MoodEntry, PrivacySettings } from "@/types";
import {
  createWrappedKey,
  unwrapDataKey,
  encryptWithKey,
  decryptWithKey,
  isEncryptedPayload,
  type WrappedKeyMaterial,
} from "./crypto";

const DB_NAME = "heart-privacy-db";
const DB_VERSION = 2;
const META_WRAPPED_KEY = "wrappedKey";
const SESSION_UNLOCK_KEY = "heart-data-key-unlocked";

interface HeartDB {
  sessions: { key: string; value: string };
  moods: { key: string; value: string };
  settings: { key: string; value: PrivacySettings };
  meta: { key: string; value: string };
}

let dbPromise: Promise<IDBPDatabase<HeartDB>> | null = null;

/** In-memory data encryption key — never persisted as plaintext. */
let memoryDataKey: CryptoKey | null = null;

function getDB(): Promise<IDBPDatabase<HeartDB>> {
  if (!dbPromise) {
    dbPromise = openDB<HeartDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore("sessions");
          db.createObjectStore("moods");
          db.createObjectStore("settings");
          db.createObjectStore("meta");
        }
        // v2: remove legacy plaintext passphrase if present (handled at runtime)
      },
    });
  }
  return dbPromise;
}

async function getWrappedKeyMaterial(): Promise<WrappedKeyMaterial | null> {
  const db = await getDB();
  const raw = await db.get("meta", META_WRAPPED_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WrappedKeyMaterial;
  } catch {
    return null;
  }
}

async function getDataKey(): Promise<CryptoKey | null> {
  if (memoryDataKey) return memoryDataKey;

  // Tab-lifetime unlock flag only — the raw key itself stays in memory for this page load.
  // If the page reloads, the user must unlock again (or we keep a sessionStorage hint).
  if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(SESSION_UNLOCK_KEY) === "1") {
    // Key was unlocked this tab session but lost from memory after HMR/reload —
    // caller must unlock again; we only use this as a UI hint via isEncryptionUnlocked.
    return null;
  }

  return null;
}

export function isEncryptionUnlocked(): boolean {
  return memoryDataKey !== null;
}

export async function isEncryptionConfigured(): Promise<boolean> {
  const material = await getWrappedKeyMaterial();
  return material !== null;
}

async function encrypt<T>(data: T, key: CryptoKey | null): Promise<string> {
  const json = JSON.stringify(data);
  if (key) {
    return encryptWithKey(json, key);
  }
  return json;
}

async function decrypt<T>(stored: string, key: CryptoKey | null): Promise<T> {
  if (isEncryptedPayload(stored)) {
    if (!key) {
      throw new Error("数据已加密，请先在隐私中心解锁");
    }
    const json = await decryptWithKey(stored, key);
    return JSON.parse(json) as T;
  }

  // Legacy plaintext JSON (pre-encryption or encryption disabled)
  return JSON.parse(stored) as T;
}

export async function saveSession(session: ChatSession): Promise<void> {
  const db = await getDB();
  const key = await getDataKey();
  const encrypted = await encrypt(session, key);
  await db.put("sessions", encrypted, session.id);
}

export async function getSession(id: string): Promise<ChatSession | null> {
  const db = await getDB();
  const stored = await db.get("sessions", id);
  if (!stored) return null;
  const key = await getDataKey();
  return decrypt<ChatSession>(stored, key);
}

export async function getAllSessions(): Promise<ChatSession[]> {
  const db = await getDB();
  const keys = await db.getAllKeys("sessions");
  const key = await getDataKey();
  const sessions: ChatSession[] = [];
  for (const storeKey of keys) {
    const stored = await db.get("sessions", storeKey);
    if (stored) {
      try {
        sessions.push(await decrypt<ChatSession>(stored, key));
      } catch {
        // Skip undecryptable entries (e.g. locked encryption)
      }
    }
  }
  return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("sessions", id);
}

export async function saveMoodEntry(entry: MoodEntry): Promise<void> {
  const db = await getDB();
  const key = await getDataKey();
  const encrypted = await encrypt(entry, key);
  await db.put("moods", encrypted, entry.id);
}

export async function getAllMoodEntries(): Promise<MoodEntry[]> {
  const db = await getDB();
  const keys = await db.getAllKeys("moods");
  const key = await getDataKey();
  const entries: MoodEntry[] = [];
  for (const storeKey of keys) {
    const stored = await db.get("moods", storeKey);
    if (stored) {
      try {
        entries.push(await decrypt<MoodEntry>(stored, key));
      } catch {
        // Skip undecryptable entries
      }
    }
  }
  return entries.sort((a, b) => b.timestamp - a.timestamp);
}

export async function deleteMoodEntry(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("moods", id);
}

const DEFAULT_SETTINGS: PrivacySettings = {
  saveConversations: true,
  saveMoodData: true,
  encryptionEnabled: false,
  ephemeralMode: false,
};

export async function getPrivacySettings(): Promise<PrivacySettings> {
  const db = await getDB();
  return (await db.get("settings", "privacy")) ?? DEFAULT_SETTINGS;
}

export async function savePrivacySettings(settings: PrivacySettings): Promise<void> {
  const db = await getDB();
  await db.put("settings", settings, "privacy");
}

/**
 * Enable encryption: generate a random data key, wrap it with the passphrase,
 * and persist only the wrapped material + verifier. Passphrase is never stored.
 */
export async function setEncryptionPassphrase(passphrase: string): Promise<void> {
  const db = await getDB();
  const { material, dataKey } = await createWrappedKey(passphrase);

  await db.put("meta", JSON.stringify(material), META_WRAPPED_KEY);
  // Remove legacy plaintext passphrase if any
  await db.delete("meta", "passphrase");

  memoryDataKey = dataKey;
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(SESSION_UNLOCK_KEY, "1");
  }

  const settings = await getPrivacySettings();
  await savePrivacySettings({ ...settings, encryptionEnabled: true });
}

/** Unlock encryption for this browser session using the passphrase. */
export async function unlockEncryption(passphrase: string): Promise<void> {
  const material = await getWrappedKeyMaterial();
  if (!material) {
    throw new Error("未配置加密");
  }
  const dataKey = await unwrapDataKey(passphrase, material);
  memoryDataKey = dataKey;
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(SESSION_UNLOCK_KEY, "1");
  }
}

export async function clearEncryptionPassphrase(): Promise<void> {
  const db = await getDB();
  await db.delete("meta", META_WRAPPED_KEY);
  await db.delete("meta", "passphrase"); // legacy cleanup
  memoryDataKey = null;
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(SESSION_UNLOCK_KEY);
  }
  const settings = await getPrivacySettings();
  await savePrivacySettings({ ...settings, encryptionEnabled: false });
}

export async function exportAllData(): Promise<string> {
  const sessions = await getAllSessions();
  const moods = await getAllMoodEntries();
  const settings = await getPrivacySettings();
  return JSON.stringify({ sessions, moods, settings, exportedAt: new Date().toISOString() }, null, 2);
}

export async function deleteAllData(): Promise<void> {
  const db = await getDB();
  await db.clear("sessions");
  await db.clear("moods");
  await db.clear("settings");
  await db.clear("meta");
  memoryDataKey = null;
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(SESSION_UNLOCK_KEY);
  }
}

export async function getStorageStats(): Promise<{ sessions: number; moods: number; encrypted: boolean }> {
  const db = await getDB();
  const sessionCount = (await db.getAllKeys("sessions")).length;
  const moodCount = (await db.getAllKeys("moods")).length;
  const settings = await getPrivacySettings();
  return { sessions: sessionCount, moods: moodCount, encrypted: settings.encryptionEnabled };
}
