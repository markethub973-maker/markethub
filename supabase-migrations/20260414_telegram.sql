-- Telegram chat history for Alex
CREATE TABLE IF NOT EXISTS public.telegram_messages (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  chat_id BIGINT NOT NULL,
  from_user TEXT,
  role TEXT NOT NULL,           -- user | assistant | system
  kind TEXT NOT NULL,           -- text | voice | photo
  text TEXT,
  voice_transcript TEXT,
  audio_reply_sent BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS telegram_messages_chat_idx ON public.telegram_messages (chat_id, created_at DESC);
