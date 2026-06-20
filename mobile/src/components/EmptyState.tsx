import { Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { useTheme } from "@/context/ThemeContext";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body: string;
}

export function EmptyState({ icon: Icon, title, body }: EmptyStateProps) {
  const { isDark } = useTheme();

  return (
    <View className="flex-1 items-center justify-center gap-3 px-8">
      <View className={`h-12 w-12 items-center justify-center rounded-lg ${isDark ? "bg-zinc-900" : "bg-white"}`}>
        <Icon size={24} color="#2dd4bf" />
      </View>
      <Text className={`text-center text-lg font-bold ${isDark ? "text-zinc-50" : "text-zinc-950"}`}>{title}</Text>
      <Text className={`text-center text-sm leading-5 ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>{body}</Text>
    </View>
  );
}
