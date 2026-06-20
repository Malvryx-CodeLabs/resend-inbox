import { Pressable, Text, View } from "react-native";
import { ArrowUpRight, Paperclip } from "lucide-react-native";
import type { EmailSummary } from "@/api/types";
import { formatRelativeTime } from "@/utils/date";
import { addressLabel, previewText } from "@/utils/email";

interface EmailRowProps {
  email: EmailSummary;
  onPress: () => void;
}

export function EmailRow({ email, onPress }: EmailRowProps) {
  const isOutbound = email.direction === "outbound";

  return (
    <Pressable
      onPress={onPress}
      className="border-b border-zinc-800 bg-black px-5 py-4 active:bg-zinc-900"
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1 gap-1">
          <View className="flex-row items-center gap-2">
            {isOutbound ? <ArrowUpRight size={14} color="#60a5fa" /> : null}
            <Text className="shrink text-base font-bold text-zinc-50" numberOfLines={1}>
              {isOutbound ? `To ${email.to[0]?.email ?? "recipient"}` : addressLabel(email.from)}
            </Text>
          </View>
          <Text className="text-sm font-semibold text-zinc-50" numberOfLines={1}>
            {email.subject || "No subject"}
          </Text>
          <Text className="text-sm leading-5 text-zinc-400" numberOfLines={2}>
            {previewText(email)}
          </Text>
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
