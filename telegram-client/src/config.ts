```typescript
import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const config = {
  telegram: {
    apiId: Number(required("TELEGRAM_API_ID")),
    apiHash: required("TELEGRAM_API_HASH"),
    session: process.env.TELEGRAM_SESSION ?? ""
  },

  worker: {
    url: required("WORKER_URL"),
    internalApiSecret: required("INTERNAL_API_SECRET")
  }
};

if (!Number.isInteger(config.telegram.apiId) || config.telegram.apiId <= 0) {
  throw new Error("TELEGRAM_API_ID must be a valid positive integer.");
}
```
