import { Pressable, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { ArrowUpRight, Copy, Paperclip, ShieldCheck } from "lucide-react-native";
import type { EmailSummary } from "@/api/types";
import { useTheme } from "@/context/ThemeContext";
import { useToast } from "@/context/ToastContext";
import { formatRelativeTime } from "@/utils/date";
import { addressLabel, detectOtp, previewText } from "@/utils/email";

interface EmailRowProps {
  email: EmailSummary;
  onPress: () => void;
}

export function EmailRow({ email, onPress }: EmailRowProps) {
  const { isDark } = useTheme();
  const { showToast } = useToast();
  const isOutbound = email.direction === "outbound";
  const code = detectOtp(email);

  async function copyCode() {
    if (!code) {
      return;
    }

    await Clipboard.setStringAsync(code);
    showToast({
      title: "Code copied",
      body: `Detected from ${email.from.email} for ${email.to[0]?.email ?? email.domain}`,
      tone: "success"
    });
  }

  return (
    <Pressable
      onPress={onPress}
      className={`border-b px-5 py-4 ${
        isDark ? "border-zinc-800 bg-black active:bg-zinc-900" : "border-zinc-200 bg-zinc-50 active:bg-zinc-100"
      }`}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1 gap-1">
          <View className="flex-row items-center gap-2">
            {isOutbound ? <ArrowUpRight size={14} color="#60a5fa" /> : null}
            <Text className={`shrink text-base font-bold ${isDark ? "text-zinc-50" : "text-zinc-950"}`} numberOfLines={1}>
              {isOutbound ? `To ${email.to[0]?.email ?? "recipient"}` : addressLabel(email.from)}
            </Text>
          </View>
          <Text className={`text-sm font-semibold ${isDark ? "text-zinc-50" : "text-zinc-950"}`} numberOfLines={1}>
            {email.subject || "No subject"}
          </Text>
          <Text className={`text-sm leading-5 ${isDark ? "text-zinc-400" : "text-zinc-600"}`} numberOfLines={2}>
            {previewText(email)}
          </Text>
          {code ? (
            <Pressable
              accessibilityRole="button"
              onPress={copyCode}
              className="mt-2 flex-row items-center gap-2 self-start rounded-lg bg-gold/15 px-3 py-2 active:opacity-80"
            >
              <ShieldCheck size={14} color="#fbbf24" />
              <Text className={`text-xs font-black ${isDark ? "text-zinc-50" : "text-zinc-950"}`}>Code {code}</Text>
              <Copy size={13} color={isDark ? "#f8fafc" : "#18181b"} />
            </Pressable>
          ) : null}
        </View>
        <View className="items-end gap-2">
          <Text className="text-xs font-semibold text-zinc-500">
            {formatRelativeTime(email.created_at)}
          </Text>
          {email.attachments.length > 0 ? <Paperclip size={14} color="#a1a1aa" /> : null}
        </View>
      </View>
    </Pressable>
  );
}
