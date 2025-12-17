-- Add recipient column to chat_messages
ALTER TABLE public.chat_messages 
ADD COLUMN recipient TEXT DEFAULT 'todos';

-- Add comment
COMMENT ON COLUMN public.chat_messages.recipient IS 'Message recipient: todos, cadastro, triagem, or medico';