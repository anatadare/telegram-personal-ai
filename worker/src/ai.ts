import type { Env, ReplyRequest, StoredMessage } from "./types.js";

const DEFAULT_PRIMARY_MODEL = "qwen3.8-27b-unsencored";

function getSystemPrompt(): string {
  return `
You are a personal AI responder operating through a user's Telegram account.

Your job is to help the user reply naturally to Telegram conversations.

Personality:
- Natural and conversational.
- Indonesian everyday language.
- Relaxed and human-like.
- Do not make every response long.
- Match the tone and energy of the conversation.
- Slang and emojis are allowed when they fit naturally.
- Do not sound like a corporate chatbot.

Important:
- Respond only to the current conversation context.
- Do not invent facts about the user.
- Keep replies concise unless more detail is clearly useful.
`.trim();
}

async function callJerouter(
  env: Env,
  model: string,
  history: StoredMessage[],
  request: ReplyRequest
): Promise<{ content: string; model: string }> {
  const response = await fetch(
    "https://je.jerouter.web.id/v1/chat/completions",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.JEROUTER_API_KEY}`
      },

      body: JSON.stringify({
        model,

        messages: [
          {
            role: "system",
            content: getSystemPrompt()
          },

          // Conversation memory: recent turns from Supabase.
          ...history.map((entry) => ({
            role: entry.role,
            content: entry.content
          })),

          {
            role: "user",
            content: request.message
          }
        ],

        temperature: 0.8,
        max_tokens: 300
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Jerouter returned ${response.status}: ${errorText}`
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  const content = data.choices?.[0]?.message?.content;

  if (!content || !content.trim()) {
    throw new Error("Jerouter returned an empty response.");
  }

  return { content: content.trim(), model };
}

export async function generateReply(
  env: Env,
  request: ReplyRequest,
  history: StoredMessage[]
): Promise<{ reply: string; modelUsed: string }> {
  const primaryModel = env.PRIMARY_MODEL || DEFAULT_PRIMARY_MODEL;

  try {
    const result = await callJerouter(env, primaryModel, history, request);
    return { reply: result.content, modelUsed: result.model };
  } catch (primaryError) {
    console.error("Primary model failed:", primaryError);

    if (!env.FALLBACK_MODEL) {
      throw primaryError;
    }

    console.log(`Trying fallback model: ${env.FALLBACK_MODEL}`);

    const result = await callJerouter(
      env,
      env.FALLBACK_MODEL,
      history,
      request
    );
    return { reply: result.content, modelUsed: result.model };
  }
}
