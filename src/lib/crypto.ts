import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// Symmetric encryption for secrets we must store at rest (LinkedIn session
// cookie, LinkedIn password) — anything that grants account access, not
// just app-level data. AES-256-GCM: random 12-byte IV per value, auth tag
// appended so tampering is detected on decrypt.
const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const raw = process.env.CONNECTION_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "CONNECTION_ENCRYPTION_KEY non impostata: necessaria per salvare credenziali/cookie LinkedIn in modo cifrato. Genera una chiave con: openssl rand -base64 32"
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("CONNECTION_ENCRYPTION_KEY deve decodificare in 32 byte (openssl rand -base64 32).");
  }
  return key;
}

// Output format: base64(iv).base64(authTag).base64(ciphertext)
export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(".");
}

export function decryptSecret(encoded: string): string {
  const key = getKey();
  const [ivB64, authTagB64, ciphertextB64] = encoded.split(".");
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error("Formato del valore cifrato non valido.");
  }
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf-8");
}

export function hasEncryptionKey(): boolean {
  return Boolean(process.env.CONNECTION_ENCRYPTION_KEY);
}
