import { Text, TextInput, View, type TextInputProps } from "react-native";

interface FieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export function Field({ label, error, className, ...props }: FieldProps) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-zinc-50">{label}</Text>
      <TextInput
        className={`min-h-12 rounded-lg border border-zinc-800 bg-zinc-950 px-4 text-base text-zinc-50 ${
          props.multiline ? "py-3" : ""
        } ${className ?? ""}`}
        placeholderTextColor="#71717a"
        autoCapitalize="none"
        autoCorrect={false}
        {...props}
      />
      {error ? <Text className="text-sm text-flame">{error}</Text> : null}
    </View>
  );
}
