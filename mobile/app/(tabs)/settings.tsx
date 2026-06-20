import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { Activity, LogOut, RefreshCw, Save } from "lucide-react-native";
import { Button } from "@/components/Button";
import { DomainBadge } from "@/components/DomainBadge";
import { Field } from "@/components/Field";
import { StatusPill } from "@/components/StatusPill";
import { useSession } from "@/context/SessionContext";

export default function SettingsScreen() {
  const {
    backendUrl,
    backendState,
    apiKeyDisplay,
    domains,
    refreshBackendStatus,
    updateBackend,
    reset
  } = useSession();
  const [backendInput, setBackendInput] = useState(backendUrl ?? "");
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRefresh() {
    setChecking(true);
    setError(null);

    try {
      await refreshBackendStatus();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Backend check failed");
    } finally {
      setChecking(false);
    }
  }

  async function handleSaveBackend() {
    setSaving(true);
    setError(null);

    try {
      await updateBackend(backendInput);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Backend update failed");
    } finally {
      setSaving(false);
    }
  }

  function confirmReset() {
    Alert.alert(
      "Reset Resend Inbox",
      "This removes the backend URL and API key from this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            void reset();
          }
        }
      ]
    );
  }

  return (
    <ScrollView className="flex-1 bg-paper" contentContainerClassName="gap-6 px-5 pb-10 pt-16">
      <View>
        <Text className="text-3xl font-black text-ink">Settings</Text>
        <Text className="mt-1 text-sm text-zinc-600">
          Resend Inbox by Malvryx-CodeLabs
        </Text>
      </View>

      <View className="gap-3 rounded-lg border border-line bg-white p-4">
        <View className="flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text className="text-base font-bold text-ink">Backend</Text>
            <Text className="text-sm text-zinc-600" numberOfLines={1}>
              {backendUrl}
            </Text>
          </View>
          <StatusPill
            label={backendState?.health ? "Online" : "Unknown"}
            tone={backendState?.health ? "ok" : "warn"}
          />
        </View>
        {backendState?.health ? (
          <Text className="text-sm text-zinc-600">
            Version {backendState.health.version}
          </Text>
        ) : null}
        <Button
          label="Check status"
          icon={Activity}
          variant="ghost"
          loading={checking}
          onPress={handleRefresh}
        />
      </View>

      <View className="gap-3 rounded-lg border border-line bg-white p-4">
        <Text className="text-base font-bold text-ink">Change Backend URL</Text>
        <Field
          label="Backend URL"
          value={backendInput}
          onChangeText={setBackendInput}
          keyboardType="url"
        />
        <Button
          label="Validate and save"
          icon={Save}
          loading={saving}
          onPress={handleSaveBackend}
        />
      </View>

      <View className="gap-3 rounded-lg border border-line bg-white p-4">
        <Text className="text-base font-bold text-ink">Security</Text>
        <Text className="text-sm text-zinc-600">
          API key stored in SecureStore: {apiKeyDisplay ?? "Not available"}
        </Text>
        <View className="flex-row items-center gap-2">
          <RefreshCw size={15} color="#0f766e" />
          <Text className="text-sm font-semibold text-pine">
            Backend abstraction enforced
          </Text>
        </View>
      </View>

      <View className="gap-3">
        <Text className="text-base font-bold text-ink">Domains</Text>
        {domains.map((domain) => (
          <DomainBadge key={domain.id} domain={domain} />
        ))}
      </View>

      {error ? (
        <View className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <Text className="text-sm font-semibold text-flame">{error}</Text>
        </View>
      ) : null}

      <Button label="Reset this device" icon={LogOut} variant="danger" onPress={confirmReset} />
    </ScrollView>
  );
}
