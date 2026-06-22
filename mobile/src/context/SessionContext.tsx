import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import {
  checkBackend,
  createSession,
  createInboxClient,
  normalizeBackendUrl
} from "@/api/client";
import type { DomainSummary, HealthResponse, MetaResponse, WebhookSetup } from "@/api/types";
import {
  registerForBackendPush,
  removeBackendPushToken
} from "@/services/notifications";
import {
  clearSession,
  loadStoredSession,
  saveBackendUrl,
  saveSession,
  saveSessionMetadata
} from "@/storage/sessionStorage";

type SessionStatus = "loading" | "signed_out" | "signed_in";

interface BackendState {
  health?: HealthResponse;
  meta?: MetaResponse;
  checkedAt?: string;
}

interface SessionContextValue {
  status: SessionStatus;
  backendUrl: string | null;
  apiKeyDisplay: string | null;
  domains: DomainSummary[];
  webhook: WebhookSetup | null;
  backendState: BackendState | null;
  client: ReturnType<typeof createInboxClient> | null;
  register: (input: {
    backendUrl: string;
    apiKey: string;
    registrationKey: string;
  }) => Promise<void>;
  prepareWebhook: () => Promise<WebhookSetup>;
  saveWebhookSecret: (signingSecret: string) => Promise<WebhookSetup>;
  updateBackend: (backendUrl: string) => Promise<void>;
  refreshBackendStatus: () => Promise<void>;
  reset: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [backendUrl, setBackendUrl] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [apiKeyDisplay, setApiKeyDisplay] = useState<string | null>(null);
  const [domains, setDomains] = useState<DomainSummary[]>([]);
  const [webhook, setWebhook] = useState<WebhookSetup | null>(null);
  const [backendState, setBackendState] = useState<BackendState | null>(null);
  const [pushToken, setPushToken] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    loadStoredSession()
      .then((stored) => {
        if (!mounted) {
          return;
        }

        setBackendUrl(stored.backendUrl);
        setSessionToken(stored.sessionToken);
        setApiKeyDisplay(stored.apiKeyDisplay);
        setDomains(stored.domains);
        setWebhook(stored.webhook);
        setStatus(stored.backendUrl && stored.sessionToken ? "signed_in" : "signed_out");
      })
      .catch(() => {
        if (mounted) {
          setStatus("signed_out");
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const refreshBackendStatus = useCallback(async () => {
    if (!backendUrl) {
      return;
    }

    const result = await checkBackend(backendUrl);
    setBackendState({
      health: result.health,
      meta: result.meta,
      checkedAt: new Date().toISOString()
    });
  }, [backendUrl]);

  const register = useCallback(
    async (input: { backendUrl: string; apiKey: string; registrationKey: string }) => {
      const normalizedBackendUrl = normalizeBackendUrl(input.backendUrl);
      const backend = await checkBackend(normalizedBackendUrl);
      const auth = await createSession(normalizedBackendUrl, {
        apiKey: input.apiKey.trim(),
        registrationKey: input.registrationKey.trim()
      });

      await saveSession({
        backendUrl: normalizedBackendUrl,
        sessionToken: auth.session.token,
        apiKeyDisplay: auth.api_key.display,
        domains: auth.domains,
        webhook: null
      });

      setBackendUrl(normalizedBackendUrl);
      setSessionToken(auth.session.token);
      setApiKeyDisplay(auth.api_key.display);
      setDomains(auth.domains);
      setWebhook(null);
      setBackendState({
        health: backend.health,
        meta: backend.meta,
        checkedAt: new Date().toISOString()
      });
      setStatus("signed_in");
    },
    []
  );

  const client = useMemo(() => {
    if (!backendUrl || !sessionToken) {
      return null;
    }

    return createInboxClient(backendUrl, sessionToken);
  }, [backendUrl, sessionToken]);

  useEffect(() => {
    if (status !== "signed_in" || !client) {
      return;
    }

    let cancelled = false;

    registerForBackendPush(client)
      .then((token) => {
        if (!cancelled && token) {
          setPushToken(token);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [client, status]);

  const prepareWebhook = useCallback(async () => {
    if (!client) {
      throw new Error("Session is not ready");
    }

    const result = await client.getWebhookSetup();
    setWebhook(result.data);
    await saveSessionMetadata({
      domains,
      webhook: result.data
    });
    return result.data;
  }, [client, domains]);

  const saveWebhookSecret = useCallback(
    async (signingSecret: string) => {
      if (!client) {
        throw new Error("Session is not ready");
      }

      const result = await client.saveWebhookSecret(signingSecret.trim());
      setWebhook(result.data);
      await saveSessionMetadata({
        domains,
        webhook: result.data
      });
      return result.data;
    },
    [client, domains]
  );

  const updateBackend = useCallback(
    async (nextBackendUrl: string) => {
      const normalizedBackendUrl = normalizeBackendUrl(nextBackendUrl);
      const backend = await checkBackend(normalizedBackendUrl);
      await saveBackendUrl(normalizedBackendUrl);
      setBackendUrl(normalizedBackendUrl);
      setBackendState({
        health: backend.health,
        meta: backend.meta,
        checkedAt: new Date().toISOString()
      });
    },
    []
  );

  const reset = useCallback(async () => {
    await removeBackendPushToken(client, pushToken).catch(() => {});
    await clearSession();
    setStatus("signed_out");
    setBackendUrl(null);
    setSessionToken(null);
    setApiKeyDisplay(null);
    setDomains([]);
    setWebhook(null);
    setBackendState(null);
    setPushToken(null);
  }, [client, pushToken]);

  const deleteAccount = useCallback(async () => {
    if (client) {
      await client.deleteAccount();
    }

    await clearSession();
    setStatus("signed_out");
    setBackendUrl(null);
    setSessionToken(null);
    setApiKeyDisplay(null);
    setDomains([]);
    setWebhook(null);
    setBackendState(null);
    setPushToken(null);
  }, [client]);

  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      backendUrl,
      apiKeyDisplay,
      domains,
      webhook,
      backendState,
      client,
      register,
      prepareWebhook,
      saveWebhookSecret,
      updateBackend,
      refreshBackendStatus,
      reset,
      deleteAccount
    }),
    [
      apiKeyDisplay,
      backendState,
      backendUrl,
      client,
      domains,
      webhook,
      refreshBackendStatus,
      prepareWebhook,
      saveWebhookSecret,
      reset,
      register,
      status,
      updateBackend,
      deleteAccount
    ]
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const value = useContext(SessionContext);

  if (!value) {
    throw new Error("useSession must be used inside SessionProvider");
  }

  return value;
}
