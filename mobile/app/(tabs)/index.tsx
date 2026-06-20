import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View
} from "react-native";
import { router } from "expo-router";
import { Inbox, RotateCw } from "lucide-react-native";
import type { EmailSummary } from "@/api/types";
import { EmailRow } from "@/components/EmailRow";
import { EmptyState } from "@/components/EmptyState";
import { InboundSetupBanner } from "@/components/InboundSetupBanner";
import { StatusPill } from "@/components/StatusPill";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useSession } from "@/context/SessionContext";
import { themed, useTheme } from "@/context/ThemeContext";

export default function InboxScreen() {
  const { client, backendState, refreshBackendStatus, domains } = useSession();
  const { isDark } = useTheme();
  const t = themed(isDark);
  const [emails, setEmails] = useState<EmailSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inboundCount = emails.filter((email) => email.direction === "inbound").length;
  const codeCount = emails.filter((email) => /\b\d{4,8}\b/.test(email.text ?? "")).length;

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!client) {
        return;
      }

      if (mode === "refresh") {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        const [emailResult] = await Promise.all([
          client.listEmails(),
          refreshBackendStatus().catch(() => undefined)
        ]);
        setEmails(emailResult.data);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Inbox failed to load");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [client, refreshBackendStatus]
  );

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View className={`flex-1 ${t.screen}`}>
      <View className={`gap-4 border-b px-5 pb-4 pt-16 ${t.border}`}>
        <View className="flex-row items-start justify-between gap-4">
          <View className="min-w-0 flex-1">
            <Text className={`text-3xl font-black ${t.text}`}>Inbox</Text>
            <Text className={`mt-1 text-sm ${t.muted}`} numberOfLines={1}>
              {domains.map((domain) => domain.domain).join(", ") || "No domains"}
            </Text>
          </View>
          <View className="items-end gap-2">
            <ThemeToggle />
            <StatusPill
              label={backendState?.health ? `v${backendState.health.version}` : "Checking"}
              tone={backendState?.health ? "ok" : "loading"}
            />
          </View>
        </View>
        <InboundSetupBanner />
        <View className="flex-row gap-3">
          <View className={`min-w-0 flex-1 rounded-lg border px-3 py-3 ${t.panel}`}>
            <Text className="text-xs font-bold uppercase text-zinc-500">Recent</Text>
            <Text className={`mt-1 text-2xl font-black ${t.text}`}>{emails.length}</Text>
          </View>
          <View className={`min-w-0 flex-1 rounded-lg border px-3 py-3 ${t.panel}`}>
            <Text className="text-xs font-bold uppercase text-zinc-500">Inbound</Text>
            <Text className={`mt-1 text-2xl font-black ${t.text}`}>{inboundCount}</Text>
          </View>
          <View className={`min-w-0 flex-1 rounded-lg border px-3 py-3 ${t.panel}`}>
            <Text className="text-xs font-bold uppercase text-zinc-500">Codes</Text>
            <Text className={`mt-1 text-2xl font-black ${t.text}`}>{codeCount}</Text>
          </View>
        </View>
        {error ? (
          <View className="flex-row items-center gap-2 rounded-lg border border-red-900 bg-red-950 px-3 py-2">
            <RotateCw size={16} color="#fb7185" />
            <Text className="min-w-0 flex-1 text-sm font-semibold text-flame">
              {error}
            </Text>
          </View>
        ) : null}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2dd4bf" />
        </View>
      ) : (
        <FlatList
          data={emails}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EmailRow
              email={item}
              onPress={() =>
                router.push({
                  pathname: "/thread/[threadId]",
                  params: { threadId: item.thread_id }
                })
              }
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor="#2dd4bf"
              onRefresh={() => void load("refresh")}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={Inbox}
              title="No mail yet"
              body="Messages delivered through Resend inbound webhooks will appear here."
            />
          }
          contentContainerClassName={emails.length === 0 ? "flex-1" : "pb-8"}
        />
      )}
    </View>
  );
}
