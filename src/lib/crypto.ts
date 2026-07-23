const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH = 32;
const ITERATIONS = 310000;

const ENCRYPTED_MARKER = "v1";

export interface WrappedKeyMaterial {
  version: typeof ENCRYPTED_MARKER;
  salt: string;
  iv: string;
  wrappedKey: string;
  verifier: string;
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveWrappingKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
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
    ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
  );
}

async function importDataKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new Uint8Array(raw),
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/** Create a random data key, wrap it with the passphrase, store only wrapped material. */
export async function createWrappedKey(passphrase: string): Promise<{
  material: WrappedKeyMaterial;
  dataKey: CryptoKey;
}> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const rawKey = crypto.getRandomValues(new Uint8Array(KEY_LENGTH));

  const wrappingKey = await deriveWrappingKey(passphrase, salt);
  const wrapped = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    wrappingKey,
    rawKey
  );

  const verifierHash = await crypto.subtle.digest("SHA-256", rawKey);

  const material: WrappedKeyMaterial = {
    version: ENCRYPTED_MARKER,
    salt: toBase64(salt.buffer),
    iv: toBase64(iv.buffer),
    wrappedKey: toBase64(wrapped),
    verifier: toBase64(verifierHash),
  };

  const dataKey = await importDataKey(rawKey);
  return { material, dataKey };
}

/** Unlock a previously wrapped data key using the passphrase. Never stores the passphrase. */
export async function unwrapDataKey(
  passphrase: string,
  material: WrappedKeyMaterial
): Promise<CryptoKey> {
  const salt = fromBase64(material.salt);
  const iv = fromBase64(material.iv);
  const wrappedKey = fromBase64(material.wrappedKey);

  const wrappingKey = await deriveWrappingKey(passphrase, salt);
  const rawKey = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    wrappingKey,
    new Uint8Array(wrappedKey)
  );

  const verifierHash = await crypto.subtle.digest("SHA-256", rawKey);
  if (toBase64(verifierHash) !== material.verifier) {
    throw new Error("密钥校验失败");
  }

  return importDataKey(new Uint8Array(rawKey));
}

/** Detect whether a stored string is an encrypted payload (vs legacy plaintext JSON). */
export function isEncryptedPayload(stored: string): boolean {
  try {
    const parsed = JSON.parse(stored) as { v?: string; salt?: string; iv?: string; data?: string };
    return parsed?.v === ENCRYPTED_MARKER && typeof parsed.salt === "string" && typeof parsed.data === "string";
  } catch {
    return false;
  }
}

export async function encryptWithKey(data: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    key,
    encoder.encode(data)
  );

  return JSON.stringify({
    v: ENCRYPTED_MARKER,
    iv: toBase64(iv.buffer),
    data: toBase64(encrypted),
    salt: "", // kept for shape compatibility; payload encryption uses the unwrapped data key
  });
}

export async function decryptWithKey(encryptedJson: string, key: CryptoKey): Promise<string> {
  const { iv, data } = JSON.parse(encryptedJson) as { iv: string; data: string };
  const ivBytes = new Uint8Array(fromBase64(iv));
  const dataBytes = new Uint8Array(fromBase64(data));
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
