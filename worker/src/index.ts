```typescript
import type {
  Env,
  ReplyRequest,
  ReplyResponse
} from "./types.js";

import { generateReply } from "./ai.js";

function json(
  data: unknown,
  status = 200
): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      }
    }
  );
}

function isAuthorized(
  request: Request,
  env: Env
): boolean {
  const authorization =
    request.headers.get("Authorization");

  return (
    authorization ===
    `Bearer ${env.INTERNAL_API_SECRET}`
  );
}

export default {
  async fetch(
    request: Request,
    env: Env
  ): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return json({
        ok: true,
        service: "telegram-personal-ai-worker",
        status: "online"
      });
    }

    if (
      request.method === "POST" &&
      url.pathname === "/api/reply"
    ) {
      if (!isAuthorized(request, env)) {
        return json(
          {
            ok: false,
            error: "Unauthorized"
          },
          401
        );
      }

      let body: ReplyRequest;

      try {
        body =
          (await request.json()) as ReplyRequest;
      } catch {
        return json(
          {
            ok: false,
            error: "Invalid JSON body"
          },
          400
        );
      }

      if (
        !body.chatId ||
        !body.message ||
        !body.chatType
      ) {
        return json(
          {
            ok: false,
            error: "Missing required fields"
          },
          400
        );
      }

      try {
        const reply =
          await generateReply(env, body);

        const result: ReplyResponse = {
          reply,
          shouldReply: true
        };

        return json(result);
      } catch (error) {
        console.error("AI error:", error);

        return json(
          {
            ok: false,
            error: "AI generation failed"
          },
          500
        );
      }
    }

    return json(
      {
        ok: false,
        error: "Not found"
      },
      404
    );
  }
};
```
