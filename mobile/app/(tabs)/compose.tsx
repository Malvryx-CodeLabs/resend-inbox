import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View
} from "react-native";
import { SendHorizonal } from "lucide-react-native";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { useSession } from "@/context/SessionContext";
import { aliasOptions } from "@/utils/email";

export default function ComposeScreen() {
  const { client, domains } = useSession();
  const aliases = useMemo(
    () => aliasOptions(domains.filter((domain) => domain.verified).map((domain) => domain.domain)),
    [domains]
  );
  const [from, setFrom] = useState(aliases[0] ?? "");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSend = from && to.trim() && subject.trim() && message.trim();

  async function handleSend() {
    if (!client || !canSend) {
      return;
    }

    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      await client.send({
        from,
        to: to.trim(),
        subject: subject.trim(),
        text: message.trim()
      });
      setTo("");
      setSubject("");
      setMessage("");
      setNotice("Message sent");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Message failed");
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
        contentContainerClassName="gap-6 px-5 pb-10 pt-16"
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <Text className="text-3xl font-black text-ink">Compose</Text>
          <Text className="mt-1 text-sm text-zinc-600">
            Send from a verified Resend domain alias.
          </Text>
        </View>

        <View className="gap-3">
          <Text className="text-sm font-semibold text-ink">From</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {aliases.map((alias) => {
                const active = alias === from;

                return (
                  <Pressable
                    key={alias}
                    onPress={() => setFrom(alias)}
                    className={`rounded-lg border px-3 py-2 ${
                      active
                        ? "border-pine bg-pine"
                        : "border-line bg-white active:bg-mist"
                    }`}
                  >
                    <Text
                      className={`text-sm font-bold ${
                        active ? "text-white" : "text-ink"
                      }`}
                    >
                      {alias}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>

        <Field label="To" value={to} onChangeText={setTo} keyboardType="email-address" />
        <Field label="Subject" value={subject} onChangeText={setSubject} />
        <Field
          label="Message"
          value={message}
          onChangeText={setMessage}
          multiline
          textAlignVertical="top"
          className="min-h-44"
        />

        {notice ? (
          <View className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
            <Text className="text-sm font-semibold text-pine">{notice}</Text>
          </View>
        ) : null}
        {error ? (
          <View className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <Text className="text-sm font-semibold text-flame">{error}</Text>
          </View>
        ) : null}

        <Button
          label="Send"
          icon={SendHorizonal}
          loading={loading}
          disabled={!canSend}
          onPress={handleSend}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
