import { Text, View } from "react-native";
import { BadgeCheck, CircleAlert } from "lucide-react-native";
import type { DomainSummary } from "@/api/types";

interface DomainBadgeProps {
  domain: DomainSummary;
}

export function DomainBadge({ domain }: DomainBadgeProps) {
  const ok = domain.verified && domain.inbound_enabled;

  return (
    <View className="flex-row items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
      {ok ? <BadgeCheck size={16} color="#2dd4bf" /> : <CircleAlert size={16} color="#fb7185" />}
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-bold text-zinc-50" numberOfLines={1}>
          {domain.domain}
        </Text>
        <Text className="text-xs text-zinc-400">
          {ok ? "Verified and inbound ready" : "Needs attention"}
        </Text>
      </View>
    </View>
  );
}
