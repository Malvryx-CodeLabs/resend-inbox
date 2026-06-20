import { Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body: string;
}

export function EmptyState({ icon: Icon, title, body }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center gap-3 px-8">
      <View className="h-12 w-12 items-center justify-center rounded-lg bg-zinc-900">
        <Icon size={24} color="#2dd4bf" />
      </View>
      <Text className="text-center text-lg font-bold text-zinc-50">{title}</Text>
      <Text className="text-center text-sm leading-5 text-zinc-400">{body}</Text>
    </View>
  );
}
