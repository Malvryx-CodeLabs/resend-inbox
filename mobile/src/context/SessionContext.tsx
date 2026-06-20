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
  createInboxClient,
  normalizeBackendUrl,
  validateApiKey
} from "@/api/client";
import type { DomainSummary, HealthResponse, MetaResponse } from "@/api/types";
import {
  clearSession,
  loadStoredSession,
  saveBackendUrl,
  saveSession
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
  backendState: BackendState | null;
  client: ReturnType<typeof createInboxClient> | null;
  signIn: (input: { backendUrl: string; apiKey: string }) => Promise<void>;
  updateBackend: (backendUrl: string) => Promise<void>;
  refreshBackendStatus: () => Promise<void>;
  reset: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [backendUrl, setBackendUrl] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apiKeyDisplay, setApiKeyDisplay] = useState<string | null>(null);
  const [domains, setDomains] = useState<DomainSummary[]>([]);
  const [backendState, setBackendState] = useState<BackendState | null>(null);

  useEffect(() => {
    let mounted = true;

    loadStoredSession()
      .then((stored) => {
        if (!mounted) {
          return;
        }

        setBackendUrl(stored.backendUrl);
        setApiKey(stored.apiKey);
        setApiKeyDisplay(stored.apiKeyDisplay);
        setDomains(stored.domains);
        setStatus(stored.backendUrl && stored.apiKey ? "signed_in" : "signed_out");
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

  const signIn = useCallback(
    async (input: { backendUrl: string; apiKey: string }) => {
      const normalizedBackendUrl = normalizeBackendUrl(input.backendUrl);
      const backend = await checkBackend(normalizedBackendUrl);
      const auth = await validateApiKey(normalizedBackendUrl, input.apiKey.trim());

      await saveSession({
        backendUrl: normalizedBackendUrl,
        apiKey: input.apiKey.trim(),
        apiKeyDisplay: auth.api_key.display,
        domains: auth.domains
      });

      setBackendUrl(normalizedBackendUrl);
      setApiKey(input.apiKey.trim());
      setApiKeyDisplay(auth.api_key.display);
      setDomains(auth.domains);
      setBackendState({
        health: backend.health,
        meta: backend.meta,
        checkedAt: new Date().toISOString()
      });
      setStatus("signed_in");
    },
    []
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
    await clearSession();
    setStatus("signed_out");
    setBackendUrl(null);
    setApiKey(null);
    setApiKeyDisplay(null);
    setDomains([]);
    setBackendState(null);
  }, []);

  const client = useMemo(() => {
    if (!backendUrl || !apiKey) {
      return null;
    }

    return createInboxClient(backendUrl, apiKey);
  }, [apiKey, backendUrl]);

  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      backendUrl,
      apiKeyDisplay,
      domains,
      backendState,
      client,
      signIn,
      updateBackend,
      refreshBackendStatus,
      reset
    }),
    [
      apiKeyDisplay,
      backendState,
      backendUrl,
      client,
      domains,
      refreshBackendStatus,
      reset,
      signIn,
      status,
      updateBackend
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
