import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import type { OutboundAttachment } from "@/api/types";

export interface LocalAttachment extends OutboundAttachment {
  size?: number;
}

const maxAttachmentBytes = 8 * 1024 * 1024;

export async function pickAttachments(): Promise<LocalAttachment[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "*/*",
    multiple: true,
    copyToCacheDirectory: true
  });

  if (result.canceled) {
    return [];
  }

  return Promise.all(
    result.assets.map(async (asset) => {
      if (asset.size && asset.size > maxAttachmentBytes) {
        throw new Error(`${asset.name} is larger than 8 MB`);
      }

      const content = asset.base64
        ? asset.base64
        : await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64
          });

      return {
        filename: asset.name,
        content,
        content_type: asset.mimeType,
        size: asset.size
      };
    })
  );
}

export function formatBytes(value?: number): string {
  if (!value) {
    return "Unknown size";
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${Math.round(value / 102.4) / 10} KB`;
  }

  return `${Math.round(value / 1024 / 102.4) / 10} MB`;
}
