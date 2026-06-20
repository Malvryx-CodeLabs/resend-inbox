import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import type { DomainSummary } from "@/api/types";

const backendUrlKey = "resend-inbox.backend-url";
const domainsKey = "resend-inbox.domains";
const apiKeyKey = "resend-inbox.api-key";
const apiKeyDisplayKey = "resend-inbox.api-key-display";

export interface StoredSession {
  backendUrl: string | null;
  apiKey: string | null;
  apiKeyDisplay: string | null;
  domains: DomainSummary[];
}

export async function loadStoredSession(): Promise<StoredSession> {
  const [backendUrl, domainsJson, apiKey, apiKeyDisplay] = await Promise.all([
    AsyncStorage.getItem(backendUrlKey),
    AsyncStorage.getItem(domainsKey),
    SecureStore.getItemAsync(apiKeyKey),
    SecureStore.getItemAsync(apiKeyDisplayKey)
  ]);

  return {
    backendUrl,
    apiKey,
    apiKeyDisplay,
    domains: parseDomains(domainsJson)
  };
}

export async function saveSession(input: {
  backendUrl: string;
  apiKey: string;
  apiKeyDisplay: string;
  domains: DomainSummary[];
}): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(backendUrlKey, input.backendUrl),
    AsyncStorage.setItem(domainsKey, JSON.stringify(input.domains)),
    SecureStore.setItemAsync(apiKeyKey, input.apiKey),
    SecureStore.setItemAsync(apiKeyDisplayKey, input.apiKeyDisplay)
  ]);
}

export async function saveBackendUrl(backendUrl: string): Promise<void> {
  await AsyncStorage.setItem(backendUrlKey, backendUrl);
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    AsyncStorage.multiRemove([backendUrlKey, domainsKey]),
    SecureStore.deleteItemAsync(apiKeyKey),
    SecureStore.deleteItemAsync(apiKeyDisplayKey)
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
