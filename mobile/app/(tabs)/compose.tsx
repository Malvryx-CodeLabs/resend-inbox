import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View
} from "react-native";
import { SendHorizonal } from "lucide-react-native";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { InboundSetupBanner } from "@/components/InboundSetupBanner";
import { SenderPicker } from "@/components/SenderPicker";
import { useSession } from "@/context/SessionContext";
import { buildAliasAddress, isValidAliasLocalPart } from "@/utils/email";

export default function ComposeScreen() {
  const { client, domains } = useSession();
  const [fromLocalPart, setFromLocalPart] = useState("hello");
  const [fromDomain, setFromDomain] = useState("");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const from = buildAliasAddress(fromLocalPart, fromDomain);
  const canSend =
    from &&
    isValidAliasLocalPart(fromLocalPart) &&
    to.trim() &&
    subject.trim() &&
    message.trim();

  async function handleSend() {
    if (!client || !canSend) {
      return;
    }

    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      await client.send({
        from,
        to: to.trim(),
        subject: subject.trim(),
        text: message.trim()
      });
      setTo("");
      setSubject("");
      setMessage("");
      setNotice("Message sent");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Message failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-black"
    >
      <ScrollView
        contentContainerClassName="gap-6 px-5 pb-10 pt-16"
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <Text className="text-3xl font-black text-zinc-50">Compose</Text>
          <Text className="mt-1 text-sm text-zinc-400">
            Send from a verified Resend domain alias.
          </Text>
        </View>

        <InboundSetupBanner />

        <SenderPicker
          domains={domains}
          localPart={fromLocalPart}
          domain={fromDomain}
          onLocalPartChange={setFromLocalPart}
          onDomainChange={setFromDomain}
        />

        <Field label="To" value={to} onChangeText={setTo} keyboardType="email-address" />
        <Field label="Subject" value={subject} onChangeText={setSubject} />
        <Field
          label="Message"
          value={message}
          onChangeText={setMessage}
          multiline
          textAlignVertical="top"
          className="min-h-44"
        />

        {notice ? (
          <View className="rounded-lg border border-emerald-900 bg-emerald-950 px-4 py-3">
            <Text className="text-sm font-semibold text-pine">{notice}</Text>
          </View>
        ) : null}
        {error ? (
          <View className="rounded-lg border border-red-900 bg-red-950 px-4 py-3">
            <Text className="text-sm font-semibold text-flame">{error}</Text>
          </View>
        ) : null}

        <Button
          label="Send"
          icon={SendHorizonal}
          loading={loading}
          disabled={!canSend}
          onPress={handleSend}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
