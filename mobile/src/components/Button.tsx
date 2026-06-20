import { ActivityIndicator, Pressable, Text, type PressableProps } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { useTheme } from "@/context/ThemeContext";

interface ButtonProps extends PressableProps {
  label: string;
  icon?: LucideIcon;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost";
}

const variants = {
  primary: "bg-pine",
  secondary: "bg-zinc-900",
  danger: "bg-flame",
  ghost: "bg-transparent border border-zinc-800"
};

const textVariants = {
  primary: "text-black",
  secondary: "text-white",
  danger: "text-black",
  ghost: "text-zinc-50"
};

export function Button({
  label,
  icon: Icon,
  loading,
  variant = "primary",
  disabled,
  className,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const { isDark } = useTheme();
  const variantClass =
    variant === "secondary"
      ? isDark
        ? "bg-zinc-900"
        : "bg-zinc-200"
      : variant === "ghost"
        ? isDark
          ? "bg-transparent border border-zinc-800"
          : "bg-transparent border border-zinc-200"
        : variants[variant];
  const textClass =
    variant === "secondary" || variant === "ghost"
      ? isDark
        ? "text-white"
        : "text-zinc-950"
      : textVariants[variant];
  const iconColor =
    variant === "secondary" || variant === "ghost"
      ? isDark
        ? "#f8fafc"
        : "#18181b"
      : "#000000";

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      className={`h-12 flex-row items-center justify-center gap-2 rounded-lg px-4 ${variantClass} ${
        isDisabled ? "opacity-55" : "active:opacity-80"
      } ${className ?? ""}`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={iconColor}
        />
      ) : (
        <>
          {Icon ? (
            <Icon
              size={18}
              color={iconColor}
            />
          ) : null}
          <Text className={`text-base font-semibold ${textClass}`}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}
