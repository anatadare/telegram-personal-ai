# Setup Guide (lanjutan dari checklist)

Urutan di bawah ini mengikuti checklist kamu, mulai dari item yang belum dicentang.

## 1. Telegram `api_id` + `api_hash`

1. Buka https://my.telegram.org dan login pakai nomor Telegram kamu.
2. Masuk ke **API development tools**.
3. Buat aplikasi baru (nama/platform bebas, isi apa saja).
4. Catat `api_id` (angka) dan `api_hash` (string panjang).

## 2. Generate Telegram session

```bash
cd telegram-client
cp .env.example .env
npm install
```

Isi `.env`:
```
TELEGRAM_API_ID=...
TELEGRAM_API_HASH=...
TELEGRAM_SESSION=
WORKER_URL=          # isi setelah worker dideploy (langkah 4)
INTERNAL_API_SECRET= # buat string acak sendiri, mis: openssl rand -hex 32
```

Jalankan:
```bash
npm run dev
```

Ikuti prompt (nomor HP, kode OTP, password 2FA kalau ada). Di akhir akan muncul **session string** — copy ke `TELEGRAM_SESSION` di `.env`. Setelah session tersimpan, kamu tidak perlu login ulang tiap start.

## 3. Setup Supabase database

1. Buat project baru di https://supabase.com.
2. Buka **SQL Editor** → New query → paste isi `worker/supabase-schema.sql` → Run.
3. Catat dari **Project Settings > API**:
   - `Project URL` → `SUPABASE_URL`
   - `service_role` secret key → `SUPABASE_SECRET_KEY` (JANGAN pakai `anon` key)

## 4. Deploy Worker

```bash
cd worker
npm install
npx wrangler login
```

Set secrets (tidak masuk ke kode/git):
```bash
npx wrangler secret put JEROUTER_API_KEY
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SECRET_KEY
npx wrangler secret put INTERNAL_API_SECRET   # samakan dengan yang di telegram-client/.env
```

Optional:
```bash
npx wrangler secret put PRIMARY_MODEL         # default: qwen3.8-27b-unsencored
npx wrangler secret put FALLBACK_MODEL
npx wrangler secret put DEFAULT_COOLDOWN_SECONDS  # default: 30
```

Deploy:
```bash
npx wrangler deploy
```

Copy URL yang muncul (mis. `https://telegram-personal-ai-worker.<subdomain>.workers.dev`) ke `WORKER_URL` di `telegram-client/.env`.

## 5. Test Jerouter (sanity check)

```bash
curl https://je.jerouter.web.id/v1/chat/completions \
  -H "Authorization: Bearer <JEROUTER_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen3.8-27b-unsencored","messages":[{"role":"user","content":"halo"}]}'
```

Kalau dapat balasan JSON dengan `choices[0].message.content`, Jerouter siap.

## 6. Connect Telegram → Worker

Sudah otomatis lewat kode: `telegram-client` mengirim tiap pesan masuk ke `worker`'s `/api/reply`, worker cek config+cooldown+memory, panggil Jerouter, simpan hasil ke Supabase, lalu balas ke client dengan `reply` + `delayMs`. Client menunggu `delayMs`, kirim status "mengetik", baru mengirim balasan asli dari akun Telegram kamu.

Jalankan:
```bash
cd telegram-client
npm run dev
```

## 7. Mengaktifkan chat (DM & Group auto-reply)

**Default: semua chat OFF** (opt-in), supaya tidak otomatis membalas semua orang. Aktifkan per chat lewat endpoint admin di worker:

```bash
curl -X PATCH https://<WORKER_URL>/api/chat-config \
  -H "Authorization: Bearer <INTERNAL_API_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"chatId":"123456789","enabled":true,"cooldownSeconds":45}'
```

- `chatId` = ID chat Telegram (muncul di log console saat pesan masuk).
- Untuk DM, cukup enable chat itu. Untuk grup, sama saja — enable per `chatId` grup tersebut.
- Cek status: `curl "https://<WORKER_URL>/api/chat-config?chatId=123456789" -H "Authorization: Bearer <INTERNAL_API_SECRET>"`

## 8. Memory, cooldown, natural delay, logging — sudah aktif otomatis

- **Memory**: 10 pesan terakhir per chat disimpan di tabel `messages` dan dikirim sebagai context ke model.
- **Cooldown**: worker menolak membalas kalau `last_reply_at` chat itu belum lewat `cooldown_seconds` (default 30s, per-chat, bisa diubah lewat endpoint di atas).
- **Natural delay**: worker mengembalikan `delayMs` acak (1.2–4 detik), client menunggu + kirim indikator "mengetik" sebelum benar-benar mengirim.
- **Logging**: tiap percobaan balasan (sukses/gagal) tercatat di tabel `reply_logs`.

## Catatan tentang system prompt

Prompt AI di `worker/src/ai.ts` sudah aku sederhanakan (menghapus instruksi "flirting/sensual tone" dan "jangan mengaku AI") karena akun ini membalas orang lain secara langsung tanpa mereka tahu itu AI. Kalau kamu tetap ingin gaya tertentu, silakan edit `getSystemPrompt()`, tapi pertimbangkan orang yang chat denganmu tidak tahu sedang bicara dengan AI — terutama untuk hal yang bersifat personal/romantis.
