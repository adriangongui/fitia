-- Add conversation_id to mensajes_chat table

ALTER TABLE public.mensajes_chat
ADD COLUMN conversation_id uuid;

-- Default existing messages to a single conversation by creating a conversation uuid based on user_id
-- (if needed, otherwise leave null)

-- Create an index for performance
CREATE INDEX IF NOT EXISTS idx_mensajes_chat_user_conversation ON public.mensajes_chat(user_id, conversation_id);
