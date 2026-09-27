```typescript
export interface Env {
  JEROUTER_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_SECRET_KEY: string;
  INTERNAL_API_SECRET: string;

  PRIMARY_MODEL?: string;
  FALLBACK_MODEL?: string;
}

export interface ReplyRequest {
  chatId: string;
  senderId: string | null;
  chatType:
    | "private"
    | "group"
    | "supergroup"
    | "channel"
    | "unknown";
  message: string;
  messageId: number | null;
}

export interface ReplyResponse {
  reply: string | null;
  shouldReply: boolean;
}
```
