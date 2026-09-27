import { Api } from "telegram";

import { createTelegramClient, registerMessageHandler } from "./telegram.js";
import { requestAIReply } from "./ai-client.js";

type ChatType = "private" | "group" | "supergroup" | "channel" | "unknown";

function resolveChatType(chat: any): ChatType {
  if (!chat) return "unknown";

  if (chat instanceof Api.User) return "private";
  if (chat instanceof Api.Chat) return "group";

  if (chat instanceof Api.Channel) {
    return chat.megagroup ? "supergroup" : "channel";
  }

  return "unknown";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

    // Never react to messages the account itself sent (avoid reply loops).
    if (message.out) {
      return;
    }

    const text = message.message;

    if (!text || !text.trim()) {
      return;
    }

    const chat = await event.getChat();
    const sender = await event.getSender();
    const chatType = resolveChatType(chat);
    const chatId = message.chatId?.toString();

    if (!chatId) {
      return;
    }

    // Broadcast channels aren't conversational; skip them entirely.
    if (chatType === "channel") {
      return;
    }

    const senderId =
      sender && "id" in sender ? sender.id?.toString() ?? null : null;

    console.log("--------------------------------------");
    console.log("New Telegram message");
    console.log(`Chat ID: ${chatId}`);
    console.log(`Chat type: ${chatType}`);
    console.log(`Message ID: ${message.id}`);
    console.log(`Text: ${text}`);
    console.log(`Sender ID: ${senderId ?? "unknown"}`);
    console.log("--------------------------------------\n");

    try {
      const response = await requestAIReply({
        chatId,
        senderId,
        chatType,
        message: text,
        messageId: message.id ?? null
      });

      if (!response.shouldReply || !response.reply) {
        if (response.reason) {
          console.log(`No reply sent (${response.reason}) for chat ${chatId}.`);
        }
        return;
      }

      // Natural delay so replies don't feel instant/robotic.
      const delayMs = response.delayMs ?? 1500;
      await sleep(delayMs);

      // Show "typing..." briefly before sending, if the chat supports it.
      try {
        await client.invoke(
          new Api.messages.SetTyping({
            peer: chat,
            action: new Api.SendMessageTypingAction()
          })
        );
      } catch {
        // Non-critical; ignore if typing indicator fails.
      }

      await client.sendMessage(chat, { message: response.reply });

      console.log(`Replied in chat ${chatId}: ${response.reply}\n`);
    } catch (error) {
      console.error(`Failed to get/send AI reply for chat ${chatId}:`, error);
    }
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
