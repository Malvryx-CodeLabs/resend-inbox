import { useEffect, useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { DomainSummary } from "@/api/types";
import { Field } from "@/components/Field";
import {
  buildAliasAddress,
  commonAliasLocalParts,
  isValidAliasLocalPart,
  normalizeAliasLocalPart
} from "@/utils/email";

interface SenderPickerProps {
  domains: DomainSummary[];
  localPart: string;
  domain: string;
  onLocalPartChange: (value: string) => void;
  onDomainChange: (value: string) => void;
  compact?: boolean;
}

export function SenderPicker({
  domains,
  localPart,
  domain,
  onLocalPartChange,
  onDomainChange,
  compact = false
}: SenderPickerProps) {
  const verifiedDomains = useMemo(
    () => domains.filter((item) => item.verified).map((item) => item.domain),
    [domains]
  );
  const address = buildAliasAddress(localPart, domain);
  const localPartError =
    localPart.trim() && !isValidAliasLocalPart(localPart)
      ? "Use a valid alias before the @."
      : undefined;

  useEffect(() => {
    if (verifiedDomains.length === 0) {
      if (domain) {
        onDomainChange("");
      }
      return;
    }

    if (!domain || !verifiedDomains.includes(domain)) {
      onDomainChange(verifiedDomains[0]);
    }
  }, [domain, onDomainChange, verifiedDomains]);

  return (
    <View className={compact ? "gap-3" : "gap-4"}>
      <View className="gap-2">
        <Text className="text-sm font-semibold text-zinc-50">Common aliases</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {commonAliasLocalParts.map((option) => {
              const active = normalizeAliasLocalPart(localPart) === option;

              return (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  onPress={() => onLocalPartChange(option)}
                  className={`rounded-lg border px-3 py-2 ${
                    active
                      ? "border-pine bg-pine"
                      : "border-zinc-800 bg-zinc-950 active:bg-zinc-900"
                  }`}
                >
                  <Text
                    className={`text-sm font-bold ${
                      active ? "text-black" : "text-zinc-50"
                    }`}
                  >
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <Field
        label="Alias"
        value={localPart}
        onChangeText={(value) => onLocalPartChange(normalizeAliasLocalPart(value))}
        placeholder="support"
        keyboardType="email-address"
        error={localPartError}
      />

      <View className="gap-2">
        <Text className="text-sm font-semibold text-zinc-50">Domain</Text>
        {verifiedDomains.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {verifiedDomains.map((option) => {
                const active = option === domain;

                return (
                  <Pressable
                    key={option}
                    accessibilityRole="button"
                    onPress={() => onDomainChange(option)}
                    className={`rounded-lg border px-3 py-2 ${
                      active
                        ? "border-pine bg-pine"
                        : "border-zinc-800 bg-zinc-950 active:bg-zinc-900"
                    }`}
                  >
                    <Text
                      className={`text-sm font-bold ${
                        active ? "text-black" : "text-zinc-50"
                      }`}
                    >
                      @{option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        ) : (
          <View className="rounded-lg border border-red-900 bg-red-950 px-3 py-2">
            <Text className="text-sm font-semibold text-flame">
              No verified sending domain found.
            </Text>
          </View>
        )}
      </View>

      {address ? (
        <View className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
          <Text className="text-xs font-bold uppercase text-zinc-500">From</Text>
          <Text className="mt-1 text-sm font-semibold text-zinc-50">{address}</Text>
        </View>
      ) : null}
    </View>
  );
}
