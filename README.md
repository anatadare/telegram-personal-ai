```markdown
# Telegram Personal AI Responder

Personal Telegram AI responder using a real Telegram user account through MTProto.

## Architecture

Telegram User Account
→ Node.js + GramJS
→ Cloudflare Worker
→ Jerouter
→ AI model

Supabase PostgreSQL will be used for:

- Conversation history
- Chat configuration
- Memory
- Cooldowns
- Reply logs

## Important

This project uses a Telegram USER ACCOUNT.

It does NOT use the Telegram Bot API for sending replies.

Messages sent by the responder originate from the connected Telegram user account.

## Security

Never commit:

- Telegram API hash
- Telegram session
- Jerouter API key
- Supabase secret key
- Internal API secret

Use environment variables and Cloudflare Secrets.

## Project structure

telegram-client/

Contains the MTProto Telegram client.

worker/

Contains the Cloudflare Worker AI/API layer.

## Development stages

1. Telegram user authentication
2. Telegram session generation
3. Cloudflare Worker deployment
4. Jerouter connection
5. Supabase database
6. DM auto-reply
7. Group reply configuration
8. Conversation memory
9. Cooldown
10. Natural response delay
11. Model fallback
12. Logging and security hardening
```
