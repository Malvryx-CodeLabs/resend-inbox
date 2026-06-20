import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";

const algorithm = "aes-256-gcm";

function encryptionKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

export function encryptApiKey(apiKey: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, encryptionKey(secret), iv);
  const encrypted = Buffer.concat([
    cipher.update(apiKey, "utf8"),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();

  return [iv, tag, encrypted]
    .map((part) => part.toString("base64url"))
    .join(".");
}

export function decryptApiKey(payload: string, secret: string): string {
  const [ivValue, tagValue, encryptedValue] = payload.split(".");

  if (!ivValue || !tagValue || !encryptedValue) {
    throw new Error("Invalid encrypted API key payload");
  }

  const decipher = createDecipheriv(
    algorithm,
    encryptionKey(secret),
    Buffer.from(ivValue, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final()
  ]).toString("utf8");
}

export function fingerprintApiKey(apiKey: string, secret: string): string {
  return createHmac("sha256", secret).update(apiKey).digest("hex");
}

export function redactApiKey(apiKey: string): string {
  if (apiKey.length <= 8) {
    return "redacted";
  }

  return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
}
