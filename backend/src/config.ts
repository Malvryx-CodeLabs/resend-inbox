import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  MONGODB_URI: z.string().min(1),
  MONGODB_DB_NAME: z.string().min(1).default("resend_inbox"),
  WEBHOOK_SECRET: z.string().min(1).optional(),
  API_KEY_ENCRYPTION_SECRET: z.string().min(16),
  SERVER_REGISTRATION_KEY: z.string().min(16),
  PUBLIC_BACKEND_URL: z.string().url().default("https://api.resendinbox.qzz.io"),
  RESEND_API_KEY: z.string().min(1).optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  SEND_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  SEND_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
  FIREBASE_PROJECT_ID: z.string().min(1).optional(),
  FIREBASE_CLIENT_EMAIL: z.string().email().optional(),
  FIREBASE_PRIVATE_KEY: z.string().min(1).optional(),
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().min(1).optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().min(1).optional()
});

export type AppConfig = z.infer<typeof envSchema> & {
  allowedOrigins: string[];
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid backend configuration: ${details}`);
  }

  return {
    ...parsed.data,
    allowedOrigins:
      parsed.data.ALLOWED_ORIGINS?.split(",")
        .map((origin) => origin.trim())
        .filter(Boolean) ?? []
  };
}
