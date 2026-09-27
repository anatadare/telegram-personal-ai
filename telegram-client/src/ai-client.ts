import { config } from "./config.js";

export interface ReplyRequest {
  chatId: string;
  senderId: string | null;
  chatType: "private" | "group" | "supergroup" | "channel" | "unknown";
  message: string;
  messageId: number | null;
}

export interface ReplyResponse {
  reply: string | null;
  shouldReply: boolean;
  reason?: string;
  delayMs?: number;
}

export async function requestAIReply(
  request: ReplyRequest
): Promise<ReplyResponse> {
  const response = await fetch(
    `${config.worker.url.replace(/\/$/, "")}/api/reply`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.worker.internalApiSecret}`
      },

      body: JSON.stringify(request)
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Worker request failed (${response.status}): ${errorText}`
    );
  }

  return (await response.json()) as ReplyResponse;
}
