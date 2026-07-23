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

export interface PrivacySettings {
  saveConversations: boolean;
  saveMoodData: boolean;
  encryptionEnabled: boolean;
  ephemeralMode: boolean;
}

export interface CrisisResource {
  name: string;
  phone: string;
  description: string;
  available: string;
}
