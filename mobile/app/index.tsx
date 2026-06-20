import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View
} from "react-native";
import { Link2, LockKeyhole, Server } from "lucide-react-native";
import { hostedBackendUrl } from "@/api/client";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { StatusPill } from "@/components/StatusPill";
import { useSession } from "@/context/SessionContext";

export default function OnboardingScreen() {
  const { signIn, status } = useSession();
  const [backendUrl, setBackendUrl] = useState(hostedBackendUrl);
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(
    () => backendUrl.trim().length > 0 && apiKey.trim().length > 0,
    [apiKey, backendUrl]
  );

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    try {
      await signIn({
        backendUrl,
        apiKey
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Connection failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-paper"
    >
      <ScrollView
        contentContainerClassName="flex-grow px-6 pb-10 pt-16"
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-between gap-10">
          <View className="gap-8">
            <View className="gap-3">
              <View className="h-14 w-14 items-center justify-center rounded-xl bg-pine">
                <Server size={28} color="#ffffff" />
              </View>
              <Text className="text-4xl font-black text-ink">Resend Inbox</Text>
              <Text className="text-base leading-6 text-zinc-600">
                Connect a Resend-native backend and unlock a mobile inbox for your verified domains.
              </Text>
            </View>

            <View className="flex-row flex-wrap gap-2">
              <StatusPill label="Self-host ready" tone="ok" />
              <StatusPill label="Secure key storage" tone="ok" />
            </View>

            <View className="gap-5">
              <Field
                label="Backend URL"
                value={backendUrl}
                onChangeText={setBackendUrl}
                placeholder="https://api.resend-inbox.dev"
                keyboardType="url"
                textContentType="URL"
              />
              <Field
                label="Resend API Key"
                value={apiKey}
                onChangeText={setApiKey}
                placeholder="re_..."
                secureTextEntry
                textContentType="password"
              />
              {error ? (
                <View className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <Text className="text-sm font-semibold text-flame">{error}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View className="gap-4">
            <View className="flex-row gap-3">
              <LockKeyhole size={18} color="#0f766e" />
              <Text className="min-w-0 flex-1 text-sm leading-5 text-zinc-600">
                The API key is stored in Expo SecureStore and never displayed after connection.
              </Text>
            </View>
            <Button
              label={status === "loading" ? "Loading" : "Connect backend"}
              icon={Link2}
              loading={loading || status === "loading"}
              disabled={!canSubmit}
              onPress={handleSubmit}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
