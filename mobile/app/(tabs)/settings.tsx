import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View
} from "react-native";
import * as ExpoClipboard from "expo-clipboard";
import {
  Activity,
  Clipboard,
  Copy,
  HelpCircle,
  LogOut,
  RefreshCw,
  Save,
  Trash2,
  X
} from "lucide-react-native";
import { Button } from "@/components/Button";
import { DomainBadge } from "@/components/DomainBadge";
import { Field } from "@/components/Field";
import { InboundSetupBanner } from "@/components/InboundSetupBanner";
import { StatusPill } from "@/components/StatusPill";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useSession } from "@/context/SessionContext";
import { themed, useTheme } from "@/context/ThemeContext";
import { useToast } from "@/context/ToastContext";

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
  const { isDark } = useTheme();
  const { showToast } = useToast();
  const t = themed(isDark);
  const [backendInput, setBackendInput] = useState(backendUrl ?? "");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [webhookSaving, setWebhookSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteChallenge, setDeleteChallenge] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const accountDeleteChallenge = useMemo(
    () => domains.find((domain) => domain.verified)?.domain ?? "delete",
    [domains]
  );

  async function handleRefresh() {
    setChecking(true);
    setError(null);
    setNotice(null);

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
    setNotice(null);

    try {
      await prepareWebhook();
      setNotice("Webhook URL is ready.");
      showToast({ title: "Webhook URL ready", tone: "success" });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Webhook setup failed");
    } finally {
      setWebhookSaving(false);
    }
  }

  async function handleSaveWebhookSecret() {
    setWebhookSaving(true);
    setError(null);
    setNotice(null);

    try {
      await saveWebhookSecret(webhookSecret);
      setWebhookSecret("");
      setNotice("Webhook signing secret saved.");
      showToast({ title: "Webhook secret saved", tone: "success" });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Webhook secret failed");
    } finally {
      setWebhookSaving(false);
    }
  }

  async function handleSaveBackend() {
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      await updateBackend(backendInput);
      setNotice("Backend URL saved.");
      showToast({ title: "Backend URL saved", tone: "success" });
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

  async function handleCopyWebhookUrl() {
    if (!webhook?.url) {
      return;
    }

    setError(null);
    try {
      await ExpoClipboard.setStringAsync(webhook.url);
      setNotice("Webhook URL copied.");
      showToast({ title: "Webhook URL copied", tone: "success" });
    } catch {
      setError("Webhook URL could not be copied");
    }
  }

  function confirmDeleteAccount() {
    setDeleteChallenge("");
    setDeleteOpen(true);
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setError(null);

    try {
      await deleteAccount();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Account deletion failed");
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  return (
    <View className={`flex-1 ${t.screen}`}>
      <ScrollView className={`flex-1 ${t.screen}`} contentContainerClassName="gap-6 px-5 pb-10 pt-16">
        <View className="flex-row items-start justify-between gap-4">
          <View className="min-w-0 flex-1">
            <Text className={`text-3xl font-black ${t.text}`}>Settings</Text>
            <Text className={`mt-1 text-sm ${t.muted}`}>
              Resend Inbox by Malvryx-CodeLabs
            </Text>
          </View>
          <ThemeToggle />
        </View>

        <InboundSetupBanner showSettingsButton={false} />

        <View className={`gap-3 rounded-lg border p-4 ${t.panel}`}>
          <View className="flex-row items-center justify-between gap-3">
            <View className="min-w-0 flex-1">
              <Text className={`text-base font-bold ${t.text}`}>Backend</Text>
              <Text className={`text-sm ${t.muted}`} numberOfLines={1}>
                {backendUrl}
              </Text>
            </View>
            <StatusPill
              label={backendState?.health ? "Online" : "Unknown"}
              tone={backendState?.health ? "ok" : "warn"}
            />
          </View>
          {backendState?.health ? (
            <Text className={`text-sm ${t.muted}`}>
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

        <View className={`gap-3 rounded-lg border p-4 ${t.panel}`}>
          <Text className={`text-base font-bold ${t.text}`}>Change Backend URL</Text>
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

        <View className={`gap-3 rounded-lg border p-4 ${t.panel}`}>
          <Text className={`text-base font-bold ${t.text}`}>Security</Text>
          <Text className={`text-sm ${t.muted}`}>
            Resend key: {apiKeyDisplay ?? "Not available"}
          </Text>
          <View className="flex-row items-center gap-2">
            <RefreshCw size={15} color="#2dd4bf" />
            <Text className="text-sm font-semibold text-pine">
              Backend abstraction enforced
            </Text>
          </View>
        </View>

        <View className={`gap-3 rounded-lg border p-4 ${t.panel}`}>
          <View className="flex-row items-center justify-between gap-3">
            <View className="min-w-0 flex-1">
              <Text className={`text-base font-bold ${t.text}`}>Inbound Webhook</Text>
              <Text className={`text-sm ${t.muted}`}>
                {webhook?.configured ? "Configured" : "Setup required"}
              </Text>
            </View>
            <StatusPill
              label={webhook?.configured ? "Ready" : "Missing"}
              tone={webhook?.configured ? "ok" : "warn"}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => setHelpOpen(true)}
            className={`flex-row items-center gap-2 self-start rounded-lg border px-3 py-2 ${t.border} ${t.active}`}
          >
            <HelpCircle size={15} color="#2dd4bf" />
            <Text className={`text-sm font-semibold ${t.text}`}>
              Don't know how to set up webhook?
            </Text>
          </Pressable>
          {webhook?.url ? (
            <View className={`rounded-lg border p-3 ${t.panelAlt}`}>
              <View className="flex-row items-center justify-between gap-3">
                <Text className="text-xs font-bold uppercase text-zinc-500">Webhook URL</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleCopyWebhookUrl}
                  className="h-8 flex-row items-center gap-1 rounded-lg bg-zinc-900 px-2 active:bg-zinc-800"
                >
                  <Copy size={14} color="#2dd4bf" />
                  <Text className="text-xs font-black text-zinc-50">Copy</Text>
                </Pressable>
              </View>
              <Text className={`mt-2 text-sm font-semibold leading-5 ${t.text}`} selectable>
                {webhook.url}
              </Text>
            </View>
          ) : null}
          {webhook?.last_received_at ? (
            <Text className={`text-sm ${t.muted}`}>
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
          <Text className={`text-base font-bold ${t.text}`}>Domains</Text>
          {domains.map((domain) => (
            <DomainBadge key={domain.id} domain={domain} />
          ))}
        </View>

        {notice ? (
          <View className="rounded-lg border border-emerald-900 bg-emerald-950 px-4 py-3">
            <Text className="text-sm font-semibold text-pine">{notice}</Text>
          </View>
        ) : null}
        {error ? (
          <View className="rounded-lg border border-red-900 bg-red-950 px-4 py-3">
            <Text className="text-sm font-semibold text-flame">{error}</Text>
          </View>
        ) : null}

        <Button label="Sign out on this device" icon={LogOut} variant="ghost" onPress={confirmReset} />
        <Button
          label="Support developer"
          icon={HelpCircle}
          variant="secondary"
          onPress={() => {
            void Linking.openURL("https://github.com/Malvryx-CodeLabs/support");
          }}
        />
        <Button label="Delete server account" icon={Trash2} variant="danger" onPress={confirmDeleteAccount} />
      </ScrollView>

      <WebhookHelpModal
        visible={helpOpen}
        webhookUrl={webhook?.url ?? ""}
        onCopyUrl={handleCopyWebhookUrl}
        onClose={() => setHelpOpen(false)}
      />
      <DeleteAccountModal
        visible={deleteOpen}
        challenge={accountDeleteChallenge}
        value={deleteChallenge}
        deleting={deleting}
        onChange={setDeleteChallenge}
        onCancel={() => setDeleteOpen(false)}
        onDelete={handleDeleteAccount}
      />
    </View>
  );
}

function WebhookHelpModal({
  visible,
  webhookUrl,
  onCopyUrl,
  onClose
}: {
  visible: boolean;
  webhookUrl: string;
  onCopyUrl: () => void;
  onClose: () => void;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      return;
    }

    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true
    }).start();
  }, [progress, visible]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [28, 0]
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 justify-end bg-black/80">
        <Animated.View
          style={{ opacity: progress, transform: [{ translateY }] }}
          className="gap-5 rounded-t-lg border-t border-zinc-800 bg-zinc-950 px-5 pb-8 pt-5"
        >
          <View className="flex-row items-center justify-between gap-3">
            <View className="min-w-0 flex-1">
              <Text className="text-lg font-black text-zinc-50">Webhook Setup</Text>
              <Text className="mt-1 text-sm text-zinc-400">
                Use these steps in your Resend dashboard.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              className="h-10 w-10 items-center justify-center rounded-lg bg-black active:bg-zinc-900"
            >
              <X size={20} color="#f8fafc" />
            </Pressable>
          </View>

          <View className="gap-3">
            {[
              "Open Resend Dashboard and go to Webhooks.",
              "Create a new endpoint and paste your webhook URL.",
              "Select the email.received event for the domains you use.",
              "Create the endpoint, then reveal and copy its signing secret.",
              "Return here, paste the signing secret, and save."
            ].map((step, index) => (
              <View key={step} className="flex-row gap-3">
                <View className="h-7 w-7 items-center justify-center rounded-full bg-pine">
                  <Text className="text-xs font-black text-black">{index + 1}</Text>
                </View>
                <Text className="min-w-0 flex-1 text-sm leading-5 text-zinc-50">{step}</Text>
              </View>
            ))}
          </View>

          {webhookUrl ? (
            <View className="gap-3 rounded-lg border border-zinc-800 bg-black p-3">
              <Text className="text-xs font-bold uppercase text-zinc-500">Webhook URL</Text>
              <Text className="text-sm font-semibold leading-5 text-zinc-50" selectable>
                {webhookUrl}
              </Text>
              <Button label="Copy webhook URL" icon={Copy} variant="ghost" onPress={onCopyUrl} />
            </View>
          ) : (
            <View className="rounded-lg border border-gold/40 bg-gold/10 px-3 py-3">
              <Text className="text-sm font-semibold text-zinc-50">
                Create your webhook URL here first, then add it in Resend.
              </Text>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

function DeleteAccountModal({
  visible,
  challenge,
  value,
  deleting,
  onChange,
  onCancel,
  onDelete
}: {
  visible: boolean;
  challenge: string;
  value: string;
  deleting: boolean;
  onChange: (value: string) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const canDelete = value.trim() === challenge;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View className="flex-1 justify-center bg-black/80 px-5">
        <View className="gap-4 rounded-lg border border-red-900 bg-zinc-950 p-5">
          <View className="flex-row items-start justify-between gap-3">
            <View className="min-w-0 flex-1">
              <Text className="text-lg font-black text-zinc-50">Delete Server Account</Text>
              <Text className="mt-2 text-sm leading-5 text-zinc-400">
                This removes your session, domains, webhook setup, threads, and emails from this backend.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              className="h-10 w-10 items-center justify-center rounded-lg bg-black active:bg-zinc-900"
            >
              <X size={20} color="#f8fafc" />
            </Pressable>
          </View>

          <Text className="text-sm leading-5 text-zinc-50">
            Type <Text className="font-black text-flame">{challenge}</Text> to continue.
          </Text>
          <Field
            label="Confirmation"
            value={value}
            onChangeText={onChange}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View className="flex-row gap-3">
            <Button
              label="Cancel"
              variant="ghost"
              className="flex-1"
              disabled={deleting}
              onPress={onCancel}
            />
            <Button
              label="Delete"
              icon={Trash2}
              variant="danger"
              className="flex-1"
              loading={deleting}
              disabled={!canDelete}
              onPress={onDelete}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
