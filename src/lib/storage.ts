import { openDB, type IDBPDatabase } from "idb";
import type { ChatSession, MoodEntry, PrivacySettings } from "@/types";
import { encryptData, decryptData } from "./crypto";

const DB_NAME = "heart-privacy-db";
const DB_VERSION = 1;

interface HeartDB {
  sessions: { key: string; value: string };
  moods: { key: string; value: string };
  settings: { key: string; value: PrivacySettings };
  meta: { key: string; value: string };
}

let dbPromise: Promise<IDBPDatabase<HeartDB>> | null = null;

function getDB(): Promise<IDBPDatabase<HeartDB>> {
  if (!dbPromise) {
    dbPromise = openDB<HeartDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore("sessions");
        db.createObjectStore("moods");
        db.createObjectStore("settings");
        db.createObjectStore("meta");
      },
    });
  }
  return dbPromise;
}

async function getPassphrase(): Promise<string | null> {
  const db = await getDB();
  return (await db.get("meta", "passphrase")) ?? null;
}

async function encrypt<T>(data: T, passphrase: string | null): Promise<string> {
  const json = JSON.stringify(data);
  if (passphrase) {
    return encryptData(json, passphrase);
  }
  return json;
}

async function decrypt<T>(stored: string, passphrase: string | null): Promise<T> {
  if (passphrase) {
    try {
      const json = await decryptData(stored, passphrase);
      return JSON.parse(json);
    } catch {
      return JSON.parse(stored);
    }
  }
  return JSON.parse(stored);
}

export async function saveSession(session: ChatSession): Promise<void> {
  const db = await getDB();
  const passphrase = await getPassphrase();
  const encrypted = await encrypt(session, passphrase);
  await db.put("sessions", encrypted, session.id);
}

export async function getSession(id: string): Promise<ChatSession | null> {
  const db = await getDB();
  const stored = await db.get("sessions", id);
  if (!stored) return null;
  const passphrase = await getPassphrase();
  return decrypt<ChatSession>(stored, passphrase);
}

export async function getAllSessions(): Promise<ChatSession[]> {
  const db = await getDB();
  const keys = await db.getAllKeys("sessions");
  const passphrase = await getPassphrase();
  const sessions: ChatSession[] = [];
  for (const key of keys) {
    const stored = await db.get("sessions", key);
    if (stored) {
      sessions.push(await decrypt<ChatSession>(stored, passphrase));
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
  const passphrase = await getPassphrase();
  const encrypted = await encrypt(entry, passphrase);
  await db.put("moods", encrypted, entry.id);
}

export async function getAllMoodEntries(): Promise<MoodEntry[]> {
  const db = await getDB();
  const keys = await db.getAllKeys("moods");
  const passphrase = await getPassphrase();
  const entries: MoodEntry[] = [];
  for (const key of keys) {
    const stored = await db.get("moods", key);
    if (stored) {
      entries.push(await decrypt<MoodEntry>(stored, passphrase));
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

export async function setEncryptionPassphrase(passphrase: string): Promise<void> {
  const db = await getDB();
  await db.put("meta", passphrase, "passphrase");
  const settings = await getPrivacySettings();
  await savePrivacySettings({ ...settings, encryptionEnabled: true });
}

export async function clearEncryptionPassphrase(): Promise<void> {
  const db = await getDB();
  await db.delete("meta", "passphrase");
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
}

export async function getStorageStats(): Promise<{ sessions: number; moods: number; encrypted: boolean }> {
  const db = await getDB();
  const sessionCount = (await db.getAllKeys("sessions")).length;
  const moodCount = (await db.getAllKeys("moods")).length;
  const settings = await getPrivacySettings();
  return { sessions: sessionCount, moods: moodCount, encrypted: settings.encryptionEnabled };
}
