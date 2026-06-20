import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import type { DomainSummary } from "@/api/types";

const backendUrlKey = "resend-inbox.backend-url";
const domainsKey = "resend-inbox.domains";
const sessionTokenKey = "resend-inbox.session-token";
const apiKeyDisplayKey = "resend-inbox.api-key-display";
const webhookKey = "resend-inbox.webhook";

export interface StoredSession {
  backendUrl: string | null;
  sessionToken: string | null;
  apiKeyDisplay: string | null;
  domains: DomainSummary[];
  webhook: {
    webhook_id: string;
    url: string;
    enabled: boolean;
    configured: boolean;
    last_received_at: string | null;
  } | null;
}

export async function loadStoredSession(): Promise<StoredSession> {
  const [backendUrl, domainsJson, sessionToken, apiKeyDisplay, webhookJson] = await Promise.all([
    AsyncStorage.getItem(backendUrlKey),
    AsyncStorage.getItem(domainsKey),
    SecureStore.getItemAsync(sessionTokenKey),
    SecureStore.getItemAsync(apiKeyDisplayKey),
    AsyncStorage.getItem(webhookKey)
  ]);

  return {
    backendUrl,
    sessionToken,
    apiKeyDisplay,
    domains: parseDomains(domainsJson),
    webhook: parseWebhook(webhookJson)
  };
}

export async function saveSession(input: {
  backendUrl: string;
  sessionToken: string;
  apiKeyDisplay: string;
  domains: DomainSummary[];
  webhook?: StoredSession["webhook"];
}): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(backendUrlKey, input.backendUrl),
    AsyncStorage.setItem(domainsKey, JSON.stringify(input.domains)),
    input.webhook
      ? AsyncStorage.setItem(webhookKey, JSON.stringify(input.webhook))
      : AsyncStorage.removeItem(webhookKey),
    SecureStore.setItemAsync(sessionTokenKey, input.sessionToken),
    SecureStore.setItemAsync(apiKeyDisplayKey, input.apiKeyDisplay)
  ]);
}

export async function saveBackendUrl(backendUrl: string): Promise<void> {
  await AsyncStorage.setItem(backendUrlKey, backendUrl);
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    AsyncStorage.multiRemove([backendUrlKey, domainsKey, webhookKey]),
    SecureStore.deleteItemAsync(sessionTokenKey),
    SecureStore.deleteItemAsync(apiKeyDisplayKey)
  ]);
}

export async function saveSessionMetadata(input: {
  domains: DomainSummary[];
  webhook: StoredSession["webhook"];
  apiKeyDisplay?: string;
}): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(domainsKey, JSON.stringify(input.domains)),
    input.webhook
      ? AsyncStorage.setItem(webhookKey, JSON.stringify(input.webhook))
      : AsyncStorage.removeItem(webhookKey),
    input.apiKeyDisplay
      ? SecureStore.setItemAsync(apiKeyDisplayKey, input.apiKeyDisplay)
      : Promise.resolve()
  ]);
}

function parseDomains(value: string | null): DomainSummary[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseWebhook(value: string | null): StoredSession["webhook"] {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);

    if (parsed && typeof parsed === "object" && typeof parsed.url === "string") {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}
