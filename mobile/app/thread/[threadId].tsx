import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import RenderHtml from "react-native-render-html";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Reply, ShieldCheck } from "lucide-react-native";
import type { EmailSummary } from "@/api/types";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { useSession } from "@/context/SessionContext";
import { formatLongDate } from "@/utils/date";
import { addressLabel, aliasOptions, detectOtp, previewText } from "@/utils/email";

export default function ThreadScreen() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const router = useRouter();
  const { client, domains } = useSession();
  const [messages, setMessages] = useState<EmailSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const aliases = useMemo(
    () => aliasOptions(domains.filter((domain) => domain.verified).map((domain) => domain.domain)),
    [domains]
  );
  const replyFrom = aliases[0] ?? "";
  const latestInbound = [...messages].reverse().find((email) => email.direction === "inbound");
  const subject = messages[0]?.subject ?? "Thread";

  const load = useCallback(async () => {
    if (!client || !threadId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await client.listThreadEmails(threadId);
      setMessages(result.data);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Thread failed to load");
    } finally {
      setLoading(false);
    }
  }, [client, threadId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleReply() {
    if (!client || !latestInbound || !replyText.trim() || !replyFrom) {
      return;
    }

    setSending(true);
    setError(null);

    try {
      await client.reply({
        email_id: latestInbound.id,
        from: replyFrom,
        text: replyText.trim()
      });
      setReplyText("");
      await load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Reply failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-paper"
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center gap-3 border-b border-line px-5 pb-4 pt-14">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-lg bg-white active:bg-mist"
        >
          <ArrowLeft size={22} color="#151714" />
        </Pressable>
        <View className="min-w-0 flex-1">
          <Text className="text-lg font-black text-ink" numberOfLines={1}>
            {subject || "No subject"}
          </Text>
          <Text className="text-sm text-zinc-600">{messages.length} messages</Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0f766e" />
        </View>
      ) : (
        <ScrollView contentContainerClassName="gap-4 px-5 py-5">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {error ? (
            <View className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <Text className="text-sm font-semibold text-flame">{error}</Text>
            </View>
          ) : null}

          <View className="gap-3 rounded-lg border border-line bg-white p-4">
            <View className="flex-row items-center gap-2">
              <Reply size={17} color="#0f766e" />
              <Text className="text-base font-bold text-ink">Reply</Text>
            </View>
            <Text className="text-sm text-zinc-600">From {replyFrom || "No alias"}</Text>
            <Field
              label="Message"
              value={replyText}
              onChangeText={setReplyText}
              multiline
              textAlignVertical="top"
              className="min-h-28"
            />
            <Button
              label="Send reply"
              icon={Reply}
              loading={sending}
              disabled={!replyText.trim() || !latestInbound || !replyFrom}
              onPress={handleReply}
            />
          </View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

function MessageBubble({ message }: { message: EmailSummary }) {
  const isOutbound = message.direction === "outbound";
  const otp = detectOtp(message.text);
  const { width } = useWindowDimensions();

  return (
    <View
      className={`gap-3 rounded-lg border p-4 ${
        isOutbound ? "border-blue-100 bg-blue-50" : "border-line bg-white"
      }`}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-bold text-ink" numberOfLines={1}>
            {isOutbound
              ? `You to ${message.to[0]?.email ?? "recipient"}`
              : addressLabel(message.from)}
          </Text>
          <Text className="mt-1 text-xs text-zinc-500">
            {formatLongDate(message.created_at)}
          </Text>
        </View>
        <Text className="rounded-full bg-mist px-2 py-1 text-xs font-bold text-ink">
          {message.direction}
        </Text>
      </View>

      {otp ? (
        <View className="flex-row items-center gap-2 rounded-lg bg-gold/10 px-3 py-2">
          <ShieldCheck size={16} color="#b0831c" />
          <Text className="text-sm font-black text-ink">Code {otp}</Text>
        </View>
      ) : null}

      {message.html ? (
        <RenderHtml
          contentWidth={width - 72}
          source={{ html: message.html }}
          baseStyle={{
            color: "#151714",
            fontSize: 16,
            lineHeight: 24
          }}
          tagsStyles={{
            a: { color: "#0f766e", fontWeight: "700" },
            p: { marginBottom: 10 },
            code: {
              backgroundColor: "#e7ece8",
              borderRadius: 6,
              paddingHorizontal: 4
            }
          }}
        />
      ) : (
        <Text className="text-base leading-6 text-ink">{previewText(message)}</Text>
      )}
    </View>
  );
}
