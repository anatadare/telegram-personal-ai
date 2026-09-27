```typescript
import { createTelegramClient, registerMessageHandler } from "./telegram.js";

async function main(): Promise<void> {
  console.log("======================================");
  console.log(" Telegram Personal AI Responder");
  console.log(" Telegram User Client");
  console.log("======================================\n");

  const client = await createTelegramClient();

  const me = await client.getMe();

  console.log("\nLogged in as:");

  if ("username" in me && me.username) {
    console.log(`@${me.username}`);
  }

  if ("firstName" in me && me.firstName) {
    console.log(`Name: ${me.firstName}`);
  }

  if ("id" in me) {
    console.log(`Telegram ID: ${me.id?.toString()}`);
  }

  console.log("\nListening for Telegram messages...\n");

  registerMessageHandler(client, async (event) => {
    const message = event.message;

    if (!message) {
      return;
    }

    const text = message.message;

    if (!text || !text.trim()) {
      return;
    }

    const chat = await event.getChat();
    const sender = await event.getSender();

    console.log("--------------------------------------");
    console.log("New Telegram message");
    console.log(`Chat ID: ${message.chatId?.toString() ?? "unknown"}`);
    console.log(`Message ID: ${message.id}`);
    console.log(`Text: ${text}`);

    if (sender && "id" in sender) {
      console.log(`Sender ID: ${sender.id?.toString() ?? "unknown"}`);
    }

    if (chat && "title" in chat && chat.title) {
      console.log(`Chat title: ${chat.title}`);
    }

    console.log("--------------------------------------\n");

    // AI reply intentionally disabled for now.
    // We will add filtering, cooldown, configuration,
    // memory and Worker communication in the next stage.
  });

  await new Promise<void>(() => {
    // Keep the Telegram client process alive.
  });
}

main().catch((error) => {
  console.error("\nFatal error:");
  console.error(error);
  process.exit(1);
});
```
