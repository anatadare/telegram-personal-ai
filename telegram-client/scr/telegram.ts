```typescript
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import input from "input";

import { config } from "./config.js";

export async function createTelegramClient(): Promise<TelegramClient> {
  const session = new StringSession(config.telegram.session);

  const client = new TelegramClient(
    session,
    config.telegram.apiId,
    config.telegram.apiHash,
    {
      connectionRetries: 5
    }
  );

  await client.start({
    phoneNumber: async () => {
      return await input.text("Telegram phone number: ");
    },

    password: async () => {
      return await input.text("Telegram 2FA password: ");
    },

    phoneCode: async () => {
      return await input.text("Telegram login code: ");
    },

    onError: (error) => {
      console.error("Telegram authentication error:", error);
    }
  });

  console.log("\nTelegram connected successfully.");

  console.log("\nIMPORTANT:");
  console.log("Copy the session string below into TELEGRAM_SESSION.");
  console.log("Do NOT commit it to GitHub.\n");

  console.log(client.session.save());

  return client;
}

export function registerMessageHandler(
  client: TelegramClient,
  handler: (event: any) => Promise<void>
): void {
  client.addEventHandler(
    async (event) => {
      try {
        await handler(event);
      } catch (error) {
        console.error("Message handler error:", error);
      }
    },
    new NewMessage({})
  );
}
```
