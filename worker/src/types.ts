export interface Env {
  JEROUTER_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_SECRET_KEY: string;
  INTERNAL_API_SECRET: string;

  PRIMARY_MODEL?: string;
  FALLBACK_MODEL?: string;

  DEFAULT_COOLDOWN_SECONDS?: string;
}

export type ChatType =
  | "private"
  | "group"
  | "supergroup"
  | "channel"
  | "unknown";

export interface ReplyRequest {
  chatId: string;
  senderId: string | null;
  chatType: ChatType;
  message: string;
  messageId: number | null;
}

export interface ReplyResponse {
  reply: string | null;
  shouldReply: boolean;
  reason?: string;
  // Milliseconds the client should wait before sending the reply,
  // to feel more natural (typing time, not instant).
  delayMs?: number;
}

export interface ChatConfig {
  chat_id: string;
  chat_type: ChatType;
  enabled: boolean;
  cooldown_seconds: number;
  last_reply_at: string | null;
}

export interface StoredMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ConfigUpdateRequest {
  chatId: string;
  enabled?: boolean;
  cooldownSeconds?: number;
}
