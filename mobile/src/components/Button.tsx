import { ActivityIndicator, Pressable, Text, type PressableProps } from "react-native";
import type { LucideIcon } from "lucide-react-native";

interface ButtonProps extends PressableProps {
  label: string;
  icon?: LucideIcon;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost";
}

const variants = {
  primary: "bg-pine",
  secondary: "bg-ink",
  danger: "bg-flame",
  ghost: "bg-transparent border border-line"
};

const textVariants = {
  primary: "text-white",
  secondary: "text-white",
  danger: "text-white",
  ghost: "text-ink"
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

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      className={`h-12 flex-row items-center justify-center gap-2 rounded-lg px-4 ${variants[variant]} ${
        isDisabled ? "opacity-55" : "active:opacity-80"
      } ${className ?? ""}`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === "ghost" ? "#151714" : "#ffffff"} />
      ) : (
        <>
          {Icon ? (
            <Icon size={18} color={variant === "ghost" ? "#151714" : "#ffffff"} />
          ) : null}
          <Text className={`text-base font-semibold ${textVariants[variant]}`}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}
