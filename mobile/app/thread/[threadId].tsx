import { useCallback, useEffect, useState } from "react";
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
import { InboundSetupBanner } from "@/components/InboundSetupBanner";
import { SenderPicker } from "@/components/SenderPicker";
import { useSession } from "@/context/SessionContext";
import { formatLongDate } from "@/utils/date";
import {
  addressLabel,
  buildAliasAddress,
  detectOtp,
  isValidAliasLocalPart,
  previewText
} from "@/utils/email";

export default function ThreadScreen() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const router = useRouter();
  const { client, domains } = useSession();
  const [messages, setMessages] = useState<EmailSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyLocalPart, setReplyLocalPart] = useState("support");
  const [replyDomain, setReplyDomain] = useState("");
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const replyFrom = buildAliasAddress(replyLocalPart, replyDomain);
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
      className="flex-1 bg-black"
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center gap-3 border-b border-zinc-800 px-5 pb-4 pt-14">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-lg bg-zinc-950 active:bg-zinc-900"
        >
          <ArrowLeft size={22} color="#f8fafc" />
        </Pressable>
        <View className="min-w-0 flex-1">
          <Text className="text-lg font-black text-zinc-50" numberOfLines={1}>
            {subject || "No subject"}
          </Text>
          <Text className="text-sm text-zinc-400">{messages.length} messages</Text>
        </View>
      </View>
      <InboundSetupBanner className="mx-5 mt-4" />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2dd4bf" />
        </View>
      ) : (
        <ScrollView contentContainerClassName="gap-4 px-5 py-5">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {error ? (
            <View className="rounded-lg border border-red-900 bg-red-950 px-4 py-3">
              <Text className="text-sm font-semibold text-flame">{error}</Text>
            </View>
          ) : null}

          <View className="gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <View className="flex-row items-center gap-2">
              <Reply size={17} color="#2dd4bf" />
              <Text className="text-base font-bold text-zinc-50">Reply</Text>
            </View>
            <SenderPicker
              domains={domains}
              localPart={replyLocalPart}
              domain={replyDomain}
              onLocalPartChange={setReplyLocalPart}
              onDomainChange={setReplyDomain}
              compact
            />
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
              disabled={
                !replyText.trim() ||
                !latestInbound ||
                !replyFrom ||
                !isValidAliasLocalPart(replyLocalPart)
              }
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
        isOutbound ? "border-sky-900 bg-sky-950" : "border-zinc-800 bg-zinc-950"
      }`}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-bold text-zinc-50" numberOfLines={1}>
            {isOutbound
              ? `You to ${message.to[0]?.email ?? "recipient"}`
              : addressLabel(message.from)}
          </Text>
          <Text className="mt-1 text-xs text-zinc-500">
            {formatLongDate(message.created_at)}
          </Text>
        </View>
        <Text className="rounded-full bg-zinc-900 px-2 py-1 text-xs font-bold text-zinc-50">
          {message.direction}
        </Text>
      </View>

      {otp ? (
        <View className="flex-row items-center gap-2 rounded-lg bg-gold/10 px-3 py-2">
          <ShieldCheck size={16} color="#fbbf24" />
          <Text className="text-sm font-black text-zinc-50">Code {otp}</Text>
        </View>
      ) : null}

      {message.html ? (
        <RenderHtml
          contentWidth={width - 72}
          source={{ html: message.html }}
          baseStyle={{
            color: "#f8fafc",
            fontSize: 16,
            lineHeight: 24
          }}
          tagsStyles={{
            a: { color: "#2dd4bf", fontWeight: "700" },
            p: { marginBottom: 10 },
            code: {
              backgroundColor: "#18181b",
              borderRadius: 6,
              paddingHorizontal: 4
            }
          }}
        />
      ) : (
        <Text className="text-base leading-6 text-zinc-50">{previewText(message)}</Text>
      )}
    </View>
  );
}
