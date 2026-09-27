import type {
  ConfigUpdateRequest,
  Env,
  ReplyRequest,
  ReplyResponse
} from "./types.js";

import { generateReply } from "./ai.js";

import {
  getOrCreateChatConfig,
  getRecentMessages,
  isInCooldown,
  logReply,
  markReplied,
  storeMessage,
  updateChatConfig
} from "./supabase.js";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

function isAuthorized(request: Request, env: Env): boolean {
  const authorization = request.headers.get("Authorization");
  return authorization === `Bearer ${env.INTERNAL_API_SECRET}`;
}

// Random natural-feeling delay before the client sends the reply.
function naturalDelayMs(): number {
  return 1200 + Math.floor(Math.random() * 2800); // 1.2s - 4.0s
}

async function handleReply(
  request: Request,
  env: Env
): Promise<Response> {
  let body: ReplyRequest;

  try {
    body = (await request.json()) as ReplyRequest;
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  if (!body.chatId || !body.message || !body.chatType) {
    return json({ ok: false, error: "Missing required fields" }, 400);
  }

  const config = await getOrCreateChatConfig(
    env,
    body.chatId,
    body.chatType
  );

  // Opt-in: a chat must be explicitly enabled (via /api/chat-config)
  // before the AI will auto-reply in it.
  if (!config.enabled) {
    const result: ReplyResponse = {
      reply: null,
      shouldReply: false,
      reason: "chat_not_enabled"
    };
    return json(result);
  }

  if (await isInCooldown(config)) {
    const result: ReplyResponse = {
      reply: null,
      shouldReply: false,
      reason: "cooldown"
    };
    return json(result);
  }

  // Always store the incoming message for memory, even if generation fails.
  await storeMessage(env, body.chatId, body.senderId, "user", body.message);

  const history = await getRecentMessages(env, body.chatId, 10);

  try {
    const { reply, modelUsed } = await generateReply(env, body, history);

    await storeMessage(env, body.chatId, null, "assistant", reply);
    await markReplied(env, body.chatId);

    await logReply(env, {
      chatId: body.chatId,
      messageId: body.messageId?.toString() ?? null,
      modelUsed,
      reply,
      success: true
    });

    const result: ReplyResponse = {
      reply,
      shouldReply: true,
      delayMs: naturalDelayMs()
    };

    return json(result);
  } catch (error) {
    console.error("AI error:", error);

    await logReply(env, {
      chatId: body.chatId,
      messageId: body.messageId?.toString() ?? null,
      modelUsed: null,
      reply: null,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });

    return json({ ok: false, error: "AI generation failed" }, 500);
  }
}

async function handleChatConfig(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method === "GET") {
    const url = new URL(request.url);
    const chatId = url.searchParams.get("chatId");
    const chatType = (url.searchParams.get("chatType") ?? "unknown") as any;

    if (!chatId) {
      return json({ ok: false, error: "chatId is required" }, 400);
    }

    const config = await getOrCreateChatConfig(env, chatId, chatType);
    return json({ ok: true, config });
  }

  if (request.method === "PATCH") {
    let body: ConfigUpdateRequest;

    try {
      body = (await request.json()) as ConfigUpdateRequest;
    } catch {
      return json({ ok: false, error: "Invalid JSON body" }, 400);
    }

    if (!body.chatId) {
      return json({ ok: false, error: "chatId is required" }, 400);
    }

    const patch: Record<string, unknown> = {};
    if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
    if (typeof body.cooldownSeconds === "number") {
      patch.cooldown_seconds = body.cooldownSeconds;
    }

    const config = await updateChatConfig(env, body.chatId, patch);
    return json({ ok: true, config });
  }

  return json({ ok: false, error: "Method not allowed" }, 405);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return json({
        ok: true,
        service: "telegram-personal-ai-worker",
        status: "online"
      });
    }

    if (!isAuthorized(request, env)) {
      return json({ ok: false, error: "Unauthorized" }, 401);
    }

    if (request.method === "POST" && url.pathname === "/api/reply") {
      return handleReply(request, env);
    }

    if (
      url.pathname === "/api/chat-config" &&
      (request.method === "GET" || request.method === "PATCH")
    ) {
      return handleChatConfig(request, env);
    }

    return json({ ok: false, error: "Not found" }, 404);
  }
};
