import type {
  ChatConfig,
  ChatType,
  Env,
  StoredMessage
} from "./types.js";

export function supabaseHeaders(env: Env): HeadersInit {
  return {
    apikey: env.SUPABASE_SECRET_KEY,
    Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
    "Content-Type": "application/json"
  };
}

export async function supabaseRequest(
  env: Env,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const baseUrl = env.SUPABASE_URL.replace(/\/$/, "");

  const headers = new Headers(init.headers);

  for (const [key, value] of Object.entries(supabaseHeaders(env))) {
    headers.set(key, value);
  }

  return fetch(`${baseUrl}/rest/v1/${path}`, {
    ...init,
    headers
  });
}

const DEFAULT_COOLDOWN_SECONDS = 30;

/**
 * Fetch a chat's config row. If it doesn't exist yet, create it
 * with enabled = false (safe default: nothing auto-replies until
 * someone explicitly turns it on for that chat).
 */
export async function getOrCreateChatConfig(
  env: Env,
  chatId: string,
  chatType: ChatType
): Promise<ChatConfig> {
  const existing = await supabaseRequest(
    env,
    `chats?chat_id=eq.${encodeURIComponent(chatId)}&select=*`
  );

  if (existing.ok) {
    const rows = (await existing.json()) as ChatConfig[];

    if (rows.length > 0) {
      return rows[0];
    }
  }

  const defaultCooldown = Number(
    env.DEFAULT_COOLDOWN_SECONDS ?? DEFAULT_COOLDOWN_SECONDS
  );

  const created = await supabaseRequest(env, "chats", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      chat_id: chatId,
      chat_type: chatType,
      enabled: false,
      cooldown_seconds: defaultCooldown
    })
  });

  if (!created.ok) {
    throw new Error(
      `Failed to create chat config: ${await created.text()}`
    );
  }

  const rows = (await created.json()) as ChatConfig[];
  return rows[0];
}

export async function updateChatConfig(
  env: Env,
  chatId: string,
  patch: Partial<Pick<ChatConfig, "enabled" | "cooldown_seconds">>
): Promise<ChatConfig> {
  const response = await supabaseRequest(
    env,
    `chats?chat_id=eq.${encodeURIComponent(chatId)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(patch)
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to update chat config: ${await response.text()}`
    );
  }

  const rows = (await response.json()) as ChatConfig[];

  if (rows.length === 0) {
    throw new Error(`Chat ${chatId} not found`);
  }

  return rows[0];
}

export async function isInCooldown(config: ChatConfig): Promise<boolean> {
  if (!config.last_reply_at) {
    return false;
  }

  const last = new Date(config.last_reply_at).getTime();
  const elapsedSeconds = (Date.now() - last) / 1000;

  return elapsedSeconds < config.cooldown_seconds;
}

export async function markReplied(
  env: Env,
  chatId: string
): Promise<void> {
  await supabaseRequest(
    env,
    `chats?chat_id=eq.${encodeURIComponent(chatId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        last_reply_at: new Date().toISOString()
      })
    }
  );
}

export async function getRecentMessages(
  env: Env,
  chatId: string,
  limit = 10
): Promise<StoredMessage[]> {
  const response = await supabaseRequest(
    env,
    `messages?chat_id=eq.${encodeURIComponent(chatId)}` +
      `&select=role,content&order=created_at.desc&limit=${limit}`
  );

  if (!response.ok) {
    return [];
  }

  const rows = (await response.json()) as StoredMessage[];

  // Rows come back newest-first; reverse to chronological order.
  return rows.reverse();
}

export async function storeMessage(
  env: Env,
  chatId: string,
  senderId: string | null,
  role: "user" | "assistant",
  content: string
): Promise<void> {
  await supabaseRequest(env, "messages", {
    method: "POST",
    body: JSON.stringify({
      chat_id: chatId,
      sender_id: senderId,
      role,
      content
    })
  });
}

export async function logReply(
  env: Env,
  params: {
    chatId: string;
    messageId: string | null;
    modelUsed: string | null;
    reply: string | null;
    success: boolean;
    error?: string;
  }
): Promise<void> {
  await supabaseRequest(env, "reply_logs", {
    method: "POST",
    body: JSON.stringify({
      chat_id: params.chatId,
      message_id: params.messageId,
      model_used: params.modelUsed,
      reply: params.reply,
      success: params.success,
      error: params.error ?? null
    })
  });
}
