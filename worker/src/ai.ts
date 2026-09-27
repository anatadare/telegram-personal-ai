```typescript
import type { Env, ReplyRequest } from "./types.js";

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
- You may use light teasing, flirting, or sensual tone when appropriate.
- Never generate sexually explicit content.
- Do not sound like a corporate chatbot.
- Do not mention that you are an AI unless the conversation requires it.

Important:
- Respond only to the current conversation context.
- Do not invent facts about the user.
- Keep replies concise unless more detail is clearly useful.
`.trim();
}

async function callJerouter(
  env: Env,
  model: string,
  request: ReplyRequest
): Promise<string> {
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

  return content.trim();
}

export async function generateReply(
  env: Env,
  request: ReplyRequest
): Promise<string> {
  const primaryModel =
    env.PRIMARY_MODEL || DEFAULT_PRIMARY_MODEL;

  try {
    return await callJerouter(
      env,
      primaryModel,
      request
    );
  } catch (primaryError) {
    console.error("Primary model failed:", primaryError);

    if (!env.FALLBACK_MODEL) {
      throw primaryError;
    }

    console.log(
      `Trying fallback model: ${env.FALLBACK_MODEL}`
    );

    return await callJerouter(
      env,
      env.FALLBACK_MODEL,
      request
    );
  }
}
```
