import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { Activity, Clipboard, LogOut, RefreshCw, Save, Trash2 } from "lucide-react-native";
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
    webhook,
    refreshBackendStatus,
    updateBackend,
    prepareWebhook,
    saveWebhookSecret,
    reset,
    deleteAccount
  } = useSession();
  const [backendInput, setBackendInput] = useState(backendUrl ?? "");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [webhookSaving, setWebhookSaving] = useState(false);
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

  async function handlePrepareWebhook() {
    setWebhookSaving(true);
    setError(null);

    try {
      await prepareWebhook();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Webhook setup failed");
    } finally {
      setWebhookSaving(false);
    }
  }

  async function handleSaveWebhookSecret() {
    setWebhookSaving(true);
    setError(null);

    try {
      await saveWebhookSecret(webhookSecret);
      setWebhookSecret("");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Webhook secret failed");
    } finally {
      setWebhookSaving(false);
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
      "This signs out on this device only. Your server data remains available if you sign in again.",
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

  function confirmDeleteAccount() {
    Alert.alert(
      "Delete Server Account",
      "This removes your session, domains, webhook setup, threads, and emails from the server.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void deleteAccount();
          }
        }
      ]
    );
  }

  return (
    <ScrollView className="flex-1 bg-black" contentContainerClassName="gap-6 px-5 pb-10 pt-16">
      <View>
        <Text className="text-3xl font-black text-zinc-50">Settings</Text>
        <Text className="mt-1 text-sm text-zinc-400">
          Resend Inbox by Malvryx-CodeLabs
        </Text>
      </View>

      <View className="gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
        <View className="flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text className="text-base font-bold text-zinc-50">Backend</Text>
            <Text className="text-sm text-zinc-400" numberOfLines={1}>
              {backendUrl}
            </Text>
          </View>
          <StatusPill
            label={backendState?.health ? "Online" : "Unknown"}
            tone={backendState?.health ? "ok" : "warn"}
          />
        </View>
        {backendState?.health ? (
          <Text className="text-sm text-zinc-400">
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

      <View className="gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
        <Text className="text-base font-bold text-zinc-50">Change Backend URL</Text>
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

      <View className="gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
        <Text className="text-base font-bold text-zinc-50">Security</Text>
        <Text className="text-sm text-zinc-400">
          Resend key: {apiKeyDisplay ?? "Not available"}
        </Text>
        <View className="flex-row items-center gap-2">
          <RefreshCw size={15} color="#2dd4bf" />
          <Text className="text-sm font-semibold text-pine">
            Backend abstraction enforced
          </Text>
        </View>
      </View>

      <View className="gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
        <View className="flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text className="text-base font-bold text-zinc-50">Inbound Webhook</Text>
            <Text className="text-sm text-zinc-400">
              {webhook?.configured ? "Configured" : "Setup required"}
            </Text>
          </View>
          <StatusPill
            label={webhook?.configured ? "Ready" : "Missing"}
            tone={webhook?.configured ? "ok" : "warn"}
          />
        </View>
        {webhook?.url ? (
          <View className="rounded-lg border border-zinc-800 bg-black p-3">
            <Text className="text-xs font-bold uppercase text-zinc-500">Webhook URL</Text>
            <Text className="mt-2 text-sm font-semibold leading-5 text-zinc-50">
              {webhook.url}
            </Text>
          </View>
        ) : null}
        {webhook?.last_received_at ? (
          <Text className="text-sm text-zinc-400">
            Last inbound event: {new Date(webhook.last_received_at).toLocaleString()}
          </Text>
        ) : null}
        <Button
          label={webhook?.url ? "Refresh webhook URL" : "Create webhook URL"}
          icon={Clipboard}
          variant="ghost"
          loading={webhookSaving}
          onPress={handlePrepareWebhook}
        />
        <Field
          label="Webhook Signing Secret"
          value={webhookSecret}
          onChangeText={setWebhookSecret}
          placeholder="whsec_..."
          secureTextEntry
        />
        <Button
          label="Save webhook secret"
          icon={Save}
          loading={webhookSaving}
          disabled={!webhookSecret.trim()}
          onPress={handleSaveWebhookSecret}
        />
      </View>

      <View className="gap-3">
        <Text className="text-base font-bold text-zinc-50">Domains</Text>
        {domains.map((domain) => (
          <DomainBadge key={domain.id} domain={domain} />
        ))}
      </View>

      {error ? (
        <View className="rounded-lg border border-red-900 bg-red-950 px-4 py-3">
          <Text className="text-sm font-semibold text-flame">{error}</Text>
        </View>
      ) : null}

      <Button label="Sign out on this device" icon={LogOut} variant="ghost" onPress={confirmReset} />
      <Button label="Delete server account" icon={Trash2} variant="danger" onPress={confirmDeleteAccount} />
    </ScrollView>
  );
}
