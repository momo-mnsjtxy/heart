/** Client-side ID helper shared by chat, mood, journal, and practice. */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Format timestamps consistently for zh-CN UI. */
export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString("zh-CN");
}

export function formatShortDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
