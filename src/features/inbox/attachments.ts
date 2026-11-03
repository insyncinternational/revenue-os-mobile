/**
 * Files for an email reply: photos from the library or camera (expo-image-picker) and any file (expo-file-system's
 * picker, native only). The reply API takes them base64-encoded, at most 10 files and 7 MB in total
 * (backend routes/inbox.ts), so both limits are checked here before anything is sent.
 */
import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";

export type ReplyAttachment = { key: string; filename: string; content_base64: string; content_type?: string; size: number };

export const MAX_ATTACHMENTS = 10;
export const MAX_ATTACHMENT_BYTES = 7 * 1024 * 1024;

/** Decoded size of a base64 string (padding excluded). */
export function base64Bytes(b64: string): number {
  const clean = b64.replace(/\s/g, "");
  const pad = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((clean.length * 3) / 4) - pad);
}

export function totalBytes(list: Pick<ReplyAttachment, "size">[]): number {
  return list.reduce((n, a) => n + a.size, 0);
}

/** "2.4 MB", "830 KB". */
export function formatBytes(bytes: number, locale: string): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toLocaleString(locale, { maximumFractionDigits: 1 })} MB`;
  return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString(locale)} KB`;
}

/** Adds what fits: never more than 10 files or 7 MB. Returns the new list and whether something was left out. */
export function addWithinLimits(current: ReplyAttachment[], incoming: ReplyAttachment[]): { list: ReplyAttachment[]; dropped: boolean } {
  const list = [...current];
  let dropped = false;
  for (const a of incoming) {
    if (list.length >= MAX_ATTACHMENTS || totalBytes(list) + a.size > MAX_ATTACHMENT_BYTES) dropped = true;
    else list.push(a);
  }
  return { list, dropped };
}

let seq = 0;
const nextKey = () => `att-${Date.now()}-${seq++}`;

function fromAsset(a: ImagePicker.ImagePickerAsset, i: number): ReplyAttachment | null {
  if (!a.base64) return null;
  const type = a.mimeType || "image/jpeg";
  const ext = type.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
  return { key: nextKey(), filename: a.fileName || `photo-${Date.now()}-${i + 1}.${ext}`, content_base64: a.base64, content_type: type, size: base64Bytes(a.base64) };
}

/** Photos are compressed (quality 0.7): plenty for an email, and several still fit under 7 MB. */
const PHOTO_OPTIONS: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], base64: true, quality: 0.7, exif: false };

export async function pickPhotos(limit: number): Promise<ReplyAttachment[]> {
  const res = await ImagePicker.launchImageLibraryAsync({ ...PHOTO_OPTIONS, allowsMultipleSelection: limit > 1, selectionLimit: Math.max(1, limit) });
  if (res.canceled) return [];
  return res.assets.map(fromAsset).filter((a): a is ReplyAttachment => a != null);
}

/** null when the camera isn't allowed (the caller says so). */
export async function takePhoto(): Promise<ReplyAttachment[] | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchCameraAsync(PHOTO_OPTIONS);
  if (res.canceled) return [];
  return res.assets.map(fromAsset).filter((a): a is ReplyAttachment => a != null);
}

/** Any file (PDF, document…). The web preview has no file picker here — photos only there. */
export const canPickFiles = Platform.OS !== "web";

export async function pickFile(): Promise<ReplyAttachment[]> {
  // Loaded on demand: the native module is only needed when someone attaches a file.
  const { File } = await import("expo-file-system");
  const res = await File.pickFileAsync();
  if (res.canceled) return [];
  const file = res.result;
  const content = await file.base64();
  return [{ key: nextKey(), filename: file.name || "file", content_base64: content, content_type: file.type || undefined, size: base64Bytes(content) }];
}
