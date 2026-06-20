import { Text, TextInput, View, type TextInputProps } from "react-native";
import { useTheme } from "@/context/ThemeContext";

interface FieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export function Field({ label, error, className, ...props }: FieldProps) {
  const { isDark } = useTheme();

  return (
    <View className="gap-2">
      <Text className={`text-sm font-semibold ${isDark ? "text-zinc-50" : "text-zinc-950"}`}>{label}</Text>
      <TextInput
        className={`min-h-12 rounded-lg border px-4 text-base ${
          isDark ? "border-zinc-800 bg-zinc-950 text-zinc-50" : "border-zinc-200 bg-white text-zinc-950"
        } ${
          props.multiline ? "py-3" : ""
        } ${className ?? ""}`}
        placeholderTextColor={isDark ? "#71717a" : "#a1a1aa"}
        autoCapitalize="none"
        autoCorrect={false}
        {...props}
      />
      {error ? <Text className="text-sm text-flame">{error}</Text> : null}
    </View>
  );
}
