```typescript
import type { Env } from "./types.js";

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
```
