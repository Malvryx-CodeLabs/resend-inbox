import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View
} from "react-native";
import { Paperclip, SendHorizonal, X } from "lucide-react-native";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { InboundSetupBanner } from "@/components/InboundSetupBanner";
import { SenderPicker } from "@/components/SenderPicker";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useSession } from "@/context/SessionContext";
import { themed, useTheme } from "@/context/ThemeContext";
import { useToast } from "@/context/ToastContext";
import { formatBytes, pickAttachments, type LocalAttachment } from "@/utils/attachments";
import { buildAliasAddress, isValidAliasLocalPart } from "@/utils/email";

export default function ComposeScreen() {
  const { client, domains } = useSession();
  const { isDark } = useTheme();
  const { showToast } = useToast();
  const t = themed(isDark);
  const [fromLocalPart, setFromLocalPart] = useState("hello");
  const [fromDomain, setFromDomain] = useState("");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = buildAliasAddress(fromLocalPart, fromDomain);
  const canSend =
    from &&
    isValidAliasLocalPart(fromLocalPart) &&
    to.trim() &&
    subject.trim() &&
    message.trim();

  async function handleSend() {
    if (!client || !canSend) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await client.send({
        from,
        to: to.trim(),
        subject: subject.trim(),
        text: message.trim(),
        attachments: attachments.map(({ filename, content, content_type }) => ({
          filename,
          content,
          content_type
        }))
      });
      setTo("");
      setSubject("");
      setMessage("");
      setAttachments([]);
      showToast({ title: "Message sent", tone: "success" });
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "Message failed";
      setError(message);
      showToast({ title: "Message failed", body: message, tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function handlePickAttachments() {
    try {
      const picked = await pickAttachments();
      if (picked.length === 0) {
        return;
      }

      setAttachments((current) => [...current, ...picked].slice(0, 10));
      showToast({
        title: picked.length === 1 ? "Attachment added" : "Attachments added",
        tone: "success"
      });
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
      <ScrollView
        contentContainerClassName="gap-6 px-5 pb-10 pt-16"
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-row items-start justify-between gap-4">
          <View className="min-w-0 flex-1">
            <Text className={`text-3xl font-black ${t.text}`}>Compose</Text>
            <Text className={`mt-1 text-sm ${t.muted}`}>
              Send from a verified Resend domain alias.
            </Text>
          </View>
          <ThemeToggle />
        </View>

        <InboundSetupBanner />

        <SenderPicker
          domains={domains}
          localPart={fromLocalPart}
          domain={fromDomain}
          onLocalPartChange={setFromLocalPart}
          onDomainChange={setFromDomain}
        />

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

        <View className={`gap-3 rounded-lg border p-4 ${t.panel}`}>
          <View className="flex-row items-center justify-between gap-3">
            <View className="min-w-0 flex-1">
              <Text className={`text-base font-bold ${t.text}`}>Attachments</Text>
              <Text className={`mt-1 text-sm ${t.muted}`}>
                Add up to 10 files.
              </Text>
            </View>
            <Button label="Add" icon={Paperclip} variant="ghost" onPress={handlePickAttachments} />
          </View>
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

        {error ? (
          <View className="rounded-lg border border-red-900 bg-red-950 px-4 py-3">
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
