import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import * as Clipboard from "expo-clipboard";
import RenderHtml from "react-native-render-html";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Copy, Paperclip, Reply, ShieldCheck, X } from "lucide-react-native";
import type { EmailSummary } from "@/api/types";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { InboundSetupBanner } from "@/components/InboundSetupBanner";
import { useSession } from "@/context/SessionContext";
import { themed, useTheme } from "@/context/ThemeContext";
import { useToast } from "@/context/ToastContext";
import { formatBytes, pickAttachments, type LocalAttachment } from "@/utils/attachments";
import { formatLongDate } from "@/utils/date";
import {
  addressLabel,
  detectOtp,
  previewText
} from "@/utils/email";

export default function ThreadScreen() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const router = useRouter();
  const { client } = useSession();
  const { isDark } = useTheme();
  const { showToast } = useToast();
  const t = themed(isDark);
  const [messages, setMessages] = useState<EmailSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestMessage = messages[messages.length - 1];
  const replyFrom = resolveThreadReplyFrom(messages);
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
    if (!client || !latestMessage || !replyText.trim() || !replyFrom) {
      return;
    }

    setSending(true);
    setError(null);

    try {
      await client.reply({
        email_id: latestMessage.id,
        text: replyText.trim(),
        attachments: attachments.map(({ filename, content, content_type }) => ({
          filename,
          content,
          content_type
        }))
      });
      setReplyText("");
      setAttachments([]);
      showToast({ title: "Reply sent", tone: "success" });
      await load();
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "Reply failed";
      setError(message);
      showToast({ title: "Reply failed", body: message, tone: "error" });
    } finally {
      setSending(false);
    }
  }

  async function handlePickAttachments() {
    try {
      const picked = await pickAttachments();
      if (picked.length === 0) {
        return;
      }

      setAttachments((current) => [...current, ...picked].slice(0, 10));
      showToast({ title: "Attachment added", tone: "success" });
    } catch (nextError) {
      showToast({
        title: "Attachment failed",
        body: nextError instanceof Error ? nextError.message : "File could not be added",
        tone: "error"
      });
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className={`flex-1 ${t.screen}`}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View className={`flex-row items-center gap-3 border-b px-5 pb-4 pt-14 ${t.border}`}>
        <Pressable
          onPress={() => router.back()}
          className={`h-10 w-10 items-center justify-center rounded-lg ${t.iconBg} ${t.active}`}
        >
          <ArrowLeft size={22} color={isDark ? "#f8fafc" : "#18181b"} />
        </Pressable>
        <View className="min-w-0 flex-1">
          <Text className={`text-lg font-black ${t.text}`} numberOfLines={1}>
            {subject || "No subject"}
          </Text>
          <Text className={`text-sm ${t.muted}`}>{messages.length} messages</Text>
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

          <View className={`gap-3 rounded-lg border p-4 ${t.panel}`}>
            <View className="flex-row items-center gap-2">
              <Reply size={17} color="#2dd4bf" />
              <Text className={`text-base font-bold ${t.text}`}>Reply</Text>
            </View>
            <View className={`rounded-lg border px-3 py-2 ${t.panelAlt}`}>
              <Text className="text-xs font-bold uppercase text-zinc-500">From</Text>
              <Text className={`mt-1 text-sm font-semibold ${t.text}`}>
                {replyFrom || "Thread alias unavailable"}
              </Text>
            </View>
            <Field
              label="Message"
              value={replyText}
              onChangeText={setReplyText}
              multiline
              textAlignVertical="top"
              className="min-h-28"
            />
            <View className="gap-2">
              <Button label="Add attachment" icon={Paperclip} variant="ghost" onPress={handlePickAttachments} />
              {attachments.map((attachment, index) => (
                <View key={`${attachment.filename}-${index}`} className={`flex-row items-center gap-3 rounded-lg border px-3 py-2 ${t.panelAlt}`}>
                  <Paperclip size={15} color="#a1a1aa" />
                  <View className="min-w-0 flex-1">
                    <Text className={`text-sm font-bold ${t.text}`} numberOfLines={1}>
                      {attachment.filename}
                    </Text>
                    <Text className={`text-xs ${t.subtle}`}>{formatBytes(attachment.size)}</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    className={`h-8 w-8 items-center justify-center rounded-lg ${isDark ? "bg-zinc-900" : "bg-zinc-100"}`}
                  >
                    <X size={15} color={isDark ? "#f8fafc" : "#18181b"} />
                  </Pressable>
                </View>
              ))}
            </View>
            <Button
              label="Send reply"
              icon={Reply}
              loading={sending}
              disabled={
                !replyText.trim() ||
                !latestMessage ||
                !replyFrom
              }
              onPress={handleReply}
            />
          </View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

function resolveThreadReplyFrom(messages: EmailSummary[]): string {
  const latest = messages[messages.length - 1];

  if (!latest) {
    return "";
  }

  if (latest.direction === "inbound") {
    return latest.to[0]?.email ?? "";
  }

  return latest.from.email;
}

function MessageBubble({ message }: { message: EmailSummary }) {
  const { client } = useSession();
  const { isDark } = useTheme();
  const { showToast } = useToast();
  const t = themed(isDark);
  const isOutbound = message.direction === "outbound";
  const otp = detectOtp(message.text);
  const { width } = useWindowDimensions();

  async function copyCode() {
    if (!otp) {
      return;
    }

    await Clipboard.setStringAsync(otp);
    showToast({
      title: "Code copied",
      body: `Detected from ${message.from.email} for ${message.to[0]?.email ?? message.domain}`,
      tone: "success"
    });
  }

  async function openAttachment(attachmentId?: string) {
    if (!client || !attachmentId) {
      showToast({
        title: "Attachment unavailable",
        body: "This attachment cannot be opened from the app yet.",
        tone: "error"
      });
      return;
    }

    try {
      const result = await client.getAttachmentDownload(message.id, attachmentId);
      await Linking.openURL(result.data.download_url);
    } catch (nextError) {
      showToast({
        title: "Attachment failed",
        body: nextError instanceof Error ? nextError.message : "Attachment could not be opened",
        tone: "error"
      });
    }
  }

  return (
    <View
      className={`gap-3 rounded-lg border p-4 ${
        isOutbound
          ? isDark
            ? "border-sky-900 bg-sky-950"
            : "border-sky-200 bg-sky-50"
          : t.panel
      }`}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className={`text-sm font-bold ${t.text}`} numberOfLines={1}>
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
        <Pressable
          accessibilityRole="button"
          onPress={copyCode}
          className="flex-row items-center gap-2 rounded-lg bg-gold/10 px-3 py-2 active:opacity-80"
        >
          <ShieldCheck size={16} color="#fbbf24" />
          <Text className={`text-sm font-black ${t.text}`}>Code {otp}</Text>
          <Copy size={15} color={isDark ? "#f8fafc" : "#18181b"} />
        </Pressable>
      ) : null}

      {message.attachments.length > 0 ? (
        <View className="gap-2">
          {message.attachments.map((attachment, index) => (
            <Pressable
              key={`${attachment.id ?? attachment.filename}-${index}`}
              accessibilityRole="button"
              onPress={() => void openAttachment(attachment.id)}
              className={`flex-row items-center gap-2 rounded-lg border px-3 py-2 ${t.panelAlt} ${t.active}`}
            >
              <Paperclip size={15} color="#a1a1aa" />
              <View className="min-w-0 flex-1">
                <Text className={`text-sm font-bold ${t.text}`} numberOfLines={1}>
                  {attachment.filename ?? "Attachment"}
                </Text>
                <Text className={`text-xs ${t.subtle}`}>{formatBytes(attachment.size)}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      {message.html ? (
        <RenderHtml
          contentWidth={width - 72}
          source={{ html: message.html }}
          baseStyle={{
            color: isDark ? "#f8fafc" : "#18181b",
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
        <Text className={`text-base leading-6 ${t.text}`}>{previewText(message)}</Text>
      )}
    </View>
  );
}
