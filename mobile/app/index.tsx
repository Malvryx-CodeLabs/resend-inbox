import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View
} from "react-native";
import * as ExpoClipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { CheckCircle2, Clipboard, Copy, KeyRound, Link2, Server } from "lucide-react-native";
import { checkBackend, hostedBackendUrl } from "@/api/client";
import type { WebhookSetup } from "@/api/types";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { StatusPill } from "@/components/StatusPill";
import { useSession } from "@/context/SessionContext";

type Step = "backend" | "account" | "webhook" | "done";

export default function OnboardingScreen() {
  const router = useRouter();
  const { register, prepareWebhook, saveWebhookSecret, status, domains } = useSession();
  const [step, setStep] = useState<Step>("backend");
  const [backendUrl, setBackendUrl] = useState(hostedBackendUrl);
  const [registrationKey, setRegistrationKey] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [webhookSetup, setWebhookSetup] = useState<WebhookSetup | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canRegister = useMemo(
    () => backendUrl.trim() && registrationKey.trim() && apiKey.trim(),
    [apiKey, backendUrl, registrationKey]
  );

  async function handleBackendCheck() {
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      await checkBackend(backendUrl);
      setStep("account");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "This server is not compatible with Resend Inbox"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      await register({
        backendUrl,
        registrationKey,
        apiKey
      });
      const setup = await prepareWebhook();
      setWebhookSetup(setup);
      setStep("webhook");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveWebhook() {
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const setup = await saveWebhookSecret(webhookSecret);
      setWebhookSetup(setup);
      setStep("done");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Webhook setup failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyWebhookUrl() {
    if (!webhookSetup?.url) {
      return;
    }

    setError(null);
    try {
      await ExpoClipboard.setStringAsync(webhookSetup.url);
      setNotice("Webhook URL copied.");
    } catch {
      setError("Webhook URL could not be copied");
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-black"
    >
      <ScrollView
        contentContainerClassName="flex-grow px-6 pb-10 pt-16"
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-between gap-10">
          <View className="gap-8">
            <View className="gap-3">
              <View className="h-14 w-14 items-center justify-center rounded-xl bg-pine">
                <Server size={28} color="#000000" />
              </View>
              <Text className="text-4xl font-black text-zinc-50">Resend Inbox</Text>
              <Text className="text-base leading-6 text-zinc-400">
                Connect your approved backend, verify your Resend account, then activate inbound mail.
              </Text>
            </View>

            <View className="flex-row flex-wrap gap-2">
              <StatusPill label="Backend checked" tone={step === "backend" ? "loading" : "ok"} />
              <StatusPill label="Account session" tone={["webhook", "done"].includes(step) ? "ok" : "loading"} />
              <StatusPill label="Inbound setup" tone={step === "done" ? "ok" : "loading"} />
            </View>

            {step === "backend" ? (
              <View className="gap-5">
                <StepHeader
                  icon={Server}
                  title="Choose Backend"
                  body="Use the hosted server or enter a self-hosted HTTPS URL."
                />
                <Field
                  label="Backend URL"
                  value={backendUrl}
                  onChangeText={setBackendUrl}
                  placeholder={hostedBackendUrl}
                  keyboardType="url"
                  textContentType="URL"
                />
                <Button
                  label="Check backend"
                  icon={Link2}
                  loading={loading || status === "loading"}
                  disabled={!backendUrl.trim()}
                  onPress={handleBackendCheck}
                />
              </View>
            ) : null}

            {step === "account" ? (
              <View className="gap-5">
                <StepHeader
                  icon={KeyRound}
                  title="Register This Device"
                  body="Enter the server access key and your Resend API key. The backend will create a private app session."
                />
                <Field
                  label="Server Access Key"
                  value={registrationKey}
                  onChangeText={setRegistrationKey}
                  placeholder="Provided by the backend owner"
                  secureTextEntry
                  textContentType="password"
                />
                <Field
                  label="Resend API Key"
                  value={apiKey}
                  onChangeText={setApiKey}
                  placeholder="re_..."
                  secureTextEntry
                  textContentType="password"
                />
                <Button
                  label="Register"
                  icon={KeyRound}
                  loading={loading}
                  disabled={!canRegister}
                  onPress={handleRegister}
                />
              </View>
            ) : null}

            {step === "webhook" ? (
              <View className="gap-5">
                <StepHeader
                  icon={Clipboard}
                  title="Activate Inbound Mail"
                  body="Add this webhook URL in Resend, then paste the webhook signing secret."
                />
                <View className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
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
                  <Text className="mt-2 text-sm font-semibold leading-5 text-zinc-50">
                    {webhookSetup?.url}
                  </Text>
                </View>
                <Field
                  label="Webhook Signing Secret"
                  value={webhookSecret}
                  onChangeText={setWebhookSecret}
                  placeholder="whsec_..."
                  secureTextEntry
                  textContentType="password"
                />
                <Button
                  label="Save webhook secret"
                  icon={Clipboard}
                  loading={loading}
                  disabled={!webhookSecret.trim()}
                  onPress={handleSaveWebhook}
                />
              </View>
            ) : null}

            {step === "done" ? (
              <View className="gap-5">
                <StepHeader
                  icon={CheckCircle2}
                  title="Inbox Ready"
                  body={`${domains.length} domain${domains.length === 1 ? "" : "s"} synced. Sending and inbound mail are ready.`}
                />
                <Button
                  label="Open inbox"
                  icon={CheckCircle2}
                  onPress={() => router.replace("/(tabs)")}
                />
              </View>
            ) : null}

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
          </View>

          <Text className="text-sm leading-5 text-zinc-500">
            Keep your server access key private. Only people with that key can register on your backend.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function StepHeader({
  icon: Icon,
  title,
  body
}: {
  icon: typeof Server;
  title: string;
  body: string;
}) {
  return (
    <View className="gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <View className="flex-row items-center gap-2">
        <Icon size={18} color="#2dd4bf" />
        <Text className="text-base font-bold text-zinc-50">{title}</Text>
      </View>
      <Text className="text-sm leading-5 text-zinc-400">{body}</Text>
    </View>
  );
}
