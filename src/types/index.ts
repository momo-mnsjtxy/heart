export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  ephemeral: boolean;
}

export interface MoodEntry {
  id: string;
  mood: number; // 1-5
  note?: string;
  tags: string[];
  timestamp: number;
}

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  promptId?: string;
  mood?: number;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface PracticeLog {
  id: string;
  type: "breathing" | "grounding" | "body-scan" | "cbt";
  label: string;
  durationSec: number;
  completedAt: number;
  note?: string;
}

export interface PrivacySettings {
  saveConversations: boolean;
  saveMoodData: boolean;
  saveJournalData: boolean;
  encryptionEnabled: boolean;
  ephemeralMode: boolean;
}

export interface CrisisResource {
  name: string;
  phone: string;
  description: string;
  available: string;
}
