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
import { useSession } from "@/context/SessionContext";

export default function InboxScreen() {
  const { client, backendState, refreshBackendStatus, domains } = useSession();
  const [emails, setEmails] = useState<EmailSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <View className="flex-1 bg-black">
      <View className="gap-4 border-b border-zinc-800 px-5 pb-4 pt-16">
        <View className="flex-row items-start justify-between gap-4">
          <View className="min-w-0 flex-1">
            <Text className="text-3xl font-black text-zinc-50">Inbox</Text>
            <Text className="mt-1 text-sm text-zinc-400" numberOfLines={1}>
              {domains.map((domain) => domain.domain).join(", ") || "No domains"}
            </Text>
          </View>
          <StatusPill
            label={backendState?.health ? `v${backendState.health.version}` : "Checking"}
            tone={backendState?.health ? "ok" : "loading"}
          />
        </View>
        <InboundSetupBanner />
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
