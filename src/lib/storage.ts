import { openDB, type IDBPDatabase } from "idb";
import type {
  ChatSession,
  MoodEntry,
  JournalEntry,
  PracticeLog,
  PrivacySettings,
} from "@/types";
import {
  createWrappedKey,
  unwrapDataKey,
  encryptWithKey,
  decryptWithKey,
  isEncryptedPayload,
  type WrappedKeyMaterial,
} from "./crypto";

const DB_NAME = "heart-privacy-db";
const DB_VERSION = 3;
const META_WRAPPED_KEY = "wrappedKey";
const SESSION_UNLOCK_KEY = "heart-data-key-unlocked";

type StoreName = "sessions" | "moods" | "journals" | "practices";

interface HeartDB {
  sessions: { key: string; value: string };
  moods: { key: string; value: string };
  journals: { key: string; value: string };
  practices: { key: string; value: string };
  settings: { key: string; value: PrivacySettings };
  meta: { key: string; value: string };
}

export interface ExportPayload {
  sessions?: ChatSession[];
  moods?: MoodEntry[];
  journals?: JournalEntry[];
  practices?: PracticeLog[];
  settings?: Partial<PrivacySettings>;
  exportedAt?: string;
}

export type EncryptionStatus = "off" | "locked" | "unlocked";

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
        if (oldVersion < 3) {
          if (!db.objectStoreNames.contains("journals")) {
            db.createObjectStore("journals");
          }
          if (!db.objectStoreNames.contains("practices")) {
            db.createObjectStore("practices");
          }
        }
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
  return null;
}

export function isEncryptionUnlocked(): boolean {
  return memoryDataKey !== null;
}

export async function isEncryptionConfigured(): Promise<boolean> {
  const material = await getWrappedKeyMaterial();
  return material !== null;
}

/** Was encryption unlocked earlier in this tab (lost after reload until re-entry). */
export function wasEncryptionUnlockedThisTab(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(SESSION_UNLOCK_KEY) === "1";
}

export async function getEncryptionStatus(): Promise<EncryptionStatus> {
  const configured = await isEncryptionConfigured();
  if (!configured) return "off";
  return memoryDataKey ? "unlocked" : "locked";
}

/**
 * When encryption is configured, writes require an unlocked key.
 * Otherwise plaintext storage is allowed.
 */
async function requireDataKeyForWrite(): Promise<CryptoKey | null> {
  const configured = await isEncryptionConfigured();
  if (!configured) return null;
  const key = await getDataKey();
  if (!key) {
    throw new Error("数据已加密，请先在隐私中心解锁");
  }
  return key;
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

  return JSON.parse(stored) as T;
}

function entryId(store: StoreName, entry: unknown): string {
  const record = entry as { id: string };
  if (!record?.id || typeof record.id !== "string") {
    throw new Error(`导入数据缺少有效 id（${store}）`);
  }
  return record.id;
}

/**
 * Re-encrypt or decrypt every row in a store using the given key.
 * `mode: "encrypt"` writes ciphertext; `mode: "decrypt"` writes plaintext JSON.
 */
async function migrateStore(
  store: StoreName,
  key: CryptoKey,
  mode: "encrypt" | "decrypt"
): Promise<number> {
  const db = await getDB();
  const keys = await db.getAllKeys(store);
  let migrated = 0;

  for (const id of keys) {
    const stored = await db.get(store, id);
    if (stored === undefined) continue;

    let parsed: unknown;
    if (isEncryptedPayload(stored)) {
      parsed = JSON.parse(await decryptWithKey(stored, key));
    } else {
      parsed = JSON.parse(stored);
    }

    const next =
      mode === "encrypt" ? await encryptWithKey(JSON.stringify(parsed), key) : JSON.stringify(parsed);
    await db.put(store, next, id);
    migrated += 1;
  }

  return migrated;
}

async function migrateAllStores(
  key: CryptoKey,
  mode: "encrypt" | "decrypt"
): Promise<{ sessions: number; moods: number; journals: number; practices: number }> {
  const stores: StoreName[] = ["sessions", "moods", "journals", "practices"];
  const counts = { sessions: 0, moods: 0, journals: 0, practices: 0 };
  for (const store of stores) {
    counts[store] = await migrateStore(store, key, mode);
  }
  return counts;
}

export async function saveSession(session: ChatSession): Promise<void> {
  const db = await getDB();
  const key = await requireDataKeyForWrite();
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
  const storedEntries = await db.getAll("sessions");
  const key = await getDataKey();
  const results = await Promise.allSettled(
    storedEntries.map((stored) => decrypt<ChatSession>(stored, key))
  );
  const sessions = results
    .filter((r): r is PromiseFulfilledResult<ChatSession> => r.status === "fulfilled")
    .map((r) => r.value);
  return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("sessions", id);
}

export async function saveMoodEntry(entry: MoodEntry): Promise<void> {
  const db = await getDB();
  const key = await requireDataKeyForWrite();
  const encrypted = await encrypt(entry, key);
  await db.put("moods", encrypted, entry.id);
}

export async function getAllMoodEntries(): Promise<MoodEntry[]> {
  const db = await getDB();
  const storedEntries = await db.getAll("moods");
  const key = await getDataKey();
  const results = await Promise.allSettled(
    storedEntries.map((stored) => decrypt<MoodEntry>(stored, key))
  );
  const entries = results
    .filter((r): r is PromiseFulfilledResult<MoodEntry> => r.status === "fulfilled")
    .map((r) => r.value);
  return entries.sort((a, b) => b.timestamp - a.timestamp);
}

export async function deleteMoodEntry(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("moods", id);
}

export async function saveJournalEntry(entry: JournalEntry): Promise<void> {
  const db = await getDB();
  const key = await requireDataKeyForWrite();
  const encrypted = await encrypt(entry, key);
  await db.put("journals", encrypted, entry.id);
}

export async function getAllJournalEntries(): Promise<JournalEntry[]> {
  const db = await getDB();
  const storedEntries = await db.getAll("journals");
  const key = await getDataKey();
  const results = await Promise.allSettled(
    storedEntries.map((stored) => decrypt<JournalEntry>(stored, key))
  );
  const entries = results
    .filter((r): r is PromiseFulfilledResult<JournalEntry> => r.status === "fulfilled")
    .map((r) => r.value);
  return entries.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteJournalEntry(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("journals", id);
}

export async function savePracticeLog(log: PracticeLog): Promise<void> {
  const db = await getDB();
  const key = await requireDataKeyForWrite();
  const encrypted = await encrypt(log, key);
  await db.put("practices", encrypted, log.id);
}

export async function getAllPracticeLogs(): Promise<PracticeLog[]> {
  const db = await getDB();
  const storedEntries = await db.getAll("practices");
  const key = await getDataKey();
  const results = await Promise.allSettled(
    storedEntries.map((stored) => decrypt<PracticeLog>(stored, key))
  );
  const logs = results
    .filter((r): r is PromiseFulfilledResult<PracticeLog> => r.status === "fulfilled")
    .map((r) => r.value);
  return logs.sort((a, b) => b.completedAt - a.completedAt);
}

const DEFAULT_SETTINGS: PrivacySettings = {
  saveConversations: true,
  saveMoodData: true,
  saveJournalData: true,
  encryptionEnabled: false,
  ephemeralMode: false,
};

export async function getPrivacySettings(): Promise<PrivacySettings> {
  const db = await getDB();
  const stored = await db.get("settings", "privacy");
  if (!stored) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function savePrivacySettings(settings: PrivacySettings): Promise<void> {
  const db = await getDB();
  await db.put("settings", settings, "privacy");
}

/**
 * Enable encryption: wrap a random data key, then migrate existing plaintext rows to ciphertext.
 */
export async function setEncryptionPassphrase(passphrase: string): Promise<{
  sessions: number;
  moods: number;
  journals: number;
  practices: number;
}> {
  const db = await getDB();
  const { material, dataKey } = await createWrappedKey(passphrase);

  await db.put("meta", JSON.stringify(material), META_WRAPPED_KEY);
  await db.delete("meta", "passphrase");

  memoryDataKey = dataKey;
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(SESSION_UNLOCK_KEY, "1");
  }

  const migrated = await migrateAllStores(dataKey, "encrypt");

  const settings = await getPrivacySettings();
  await savePrivacySettings({ ...settings, encryptionEnabled: true });
  return migrated;
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

/**
 * Disable encryption: decrypt all rows to plaintext, then discard the wrapped key.
 * Requires an unlocked session.
 */
export async function clearEncryptionPassphrase(): Promise<{
  sessions: number;
  moods: number;
  journals: number;
  practices: number;
}> {
  const configured = await isEncryptionConfigured();
  if (!configured) {
    return { sessions: 0, moods: 0, journals: 0, practices: 0 };
  }

  const key = memoryDataKey;
  if (!key) {
    throw new Error("请先解锁加密后再关闭，以免无法解密已有数据");
  }

  const migrated = await migrateAllStores(key, "decrypt");

  const db = await getDB();
  await db.delete("meta", META_WRAPPED_KEY);
  await db.delete("meta", "passphrase");
  memoryDataKey = null;
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(SESSION_UNLOCK_KEY);
  }
  const settings = await getPrivacySettings();
  await savePrivacySettings({ ...settings, encryptionEnabled: false });
  return migrated;
}

export async function exportAllData(): Promise<string> {
  const status = await getEncryptionStatus();
  if (status === "locked") {
    throw new Error("数据已加密，请先解锁后再导出");
  }

  const sessions = await getAllSessions();
  const moods = await getAllMoodEntries();
  const journals = await getAllJournalEntries();
  const practices = await getAllPracticeLogs();
  const settings = await getPrivacySettings();
  return JSON.stringify(
    { sessions, moods, journals, practices, settings, exportedAt: new Date().toISOString() },
    null,
    2
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseExportPayload(json: string): ExportPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("文件不是有效的 JSON");
  }

  if (!isObject(parsed)) {
    throw new Error("备份格式无效");
  }

  const payload = parsed as ExportPayload;
  for (const key of ["sessions", "moods", "journals", "practices"] as const) {
    if (payload[key] !== undefined && !Array.isArray(payload[key])) {
      throw new Error(`备份字段 ${key} 必须是数组`);
    }
  }
  if (payload.settings !== undefined && !isObject(payload.settings)) {
    throw new Error("备份字段 settings 必须是对象");
  }

  return payload;
}

/**
 * Import a previously exported JSON backup.
 * - merge: upsert by id
 * - replace: clear stores first, then write
 * Encryption settings in the backup are ignored; current local encryption policy applies.
 */
export async function importAllData(
  json: string,
  mode: "merge" | "replace" = "merge"
): Promise<{ sessions: number; moods: number; journals: number; practices: number }> {
  const status = await getEncryptionStatus();
  if (status === "locked") {
    throw new Error("数据已加密，请先解锁后再导入");
  }

  const payload = parseExportPayload(json);
  const db = await getDB();
  const writeKey = await requireDataKeyForWrite();

  if (mode === "replace") {
    await db.clear("sessions");
    await db.clear("moods");
    await db.clear("journals");
    await db.clear("practices");
  }

  const counts = { sessions: 0, moods: 0, journals: 0, practices: 0 };

  for (const session of payload.sessions || []) {
    const id = entryId("sessions", session);
    await db.put("sessions", await encrypt({ ...session, id }, writeKey), id);
    counts.sessions += 1;
  }
  for (const mood of payload.moods || []) {
    const id = entryId("moods", mood);
    await db.put("moods", await encrypt({ ...mood, id }, writeKey), id);
    counts.moods += 1;
  }
  for (const journal of payload.journals || []) {
    const id = entryId("journals", journal);
    await db.put("journals", await encrypt({ ...journal, id }, writeKey), id);
    counts.journals += 1;
  }
  for (const practice of payload.practices || []) {
    const id = entryId("practices", practice);
    await db.put("practices", await encrypt({ ...practice, id }, writeKey), id);
    counts.practices += 1;
  }

  if (payload.settings) {
    const current = await getPrivacySettings();
    const next: PrivacySettings = {
      ...current,
      saveConversations: payload.settings.saveConversations ?? current.saveConversations,
      saveMoodData: payload.settings.saveMoodData ?? current.saveMoodData,
      saveJournalData: payload.settings.saveJournalData ?? current.saveJournalData,
      ephemeralMode: payload.settings.ephemeralMode ?? current.ephemeralMode,
      // Keep local encryption state; do not import encryptionEnabled from backup
      encryptionEnabled: current.encryptionEnabled,
    };
    await savePrivacySettings(next);
  }

  return counts;
}

export async function deleteAllData(): Promise<void> {
  const db = await getDB();
  await db.clear("sessions");
  await db.clear("moods");
  await db.clear("journals");
  await db.clear("practices");
  await db.clear("settings");
  await db.clear("meta");
  memoryDataKey = null;
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(SESSION_UNLOCK_KEY);
  }
}

export async function getStorageStats(): Promise<{
  sessions: number;
  moods: number;
  journals: number;
  practices: number;
  encrypted: boolean;
}> {
  const db = await getDB();
  const sessionCount = (await db.getAllKeys("sessions")).length;
  const moodCount = (await db.getAllKeys("moods")).length;
  const journalCount = (await db.getAllKeys("journals")).length;
  const practiceCount = (await db.getAllKeys("practices")).length;
  const settings = await getPrivacySettings();
  return {
    sessions: sessionCount,
    moods: moodCount,
    journals: journalCount,
    practices: practiceCount,
    encrypted: settings.encryptionEnabled,
  };
}
