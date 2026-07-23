const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const ITERATIONS = 310000;

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  const saltBuffer = new Uint8Array(salt);

  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBuffer, iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function encryptData(data: string, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(passphrase, salt);
  const encoder = new TextEncoder();
  const ivBytes = new Uint8Array(iv);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: ivBytes },
    key,
    encoder.encode(data)
  );

  return JSON.stringify({
    salt: toBase64(salt.buffer),
    iv: toBase64(iv.buffer),
    data: toBase64(encrypted),
  });
}

export async function decryptData(encryptedJson: string, passphrase: string): Promise<string> {
  const { salt, iv, data } = JSON.parse(encryptedJson);
  const key = await deriveKey(passphrase, fromBase64(salt));
  const ivBytes = new Uint8Array(fromBase64(iv));
  const dataBytes = fromBase64(data);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes },
    key,
    dataBytes
  );
  return new TextDecoder().decode(decrypted);
}

export function generateSessionKey(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashPassphrase(passphrase: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(passphrase);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return toBase64(hash);
}
