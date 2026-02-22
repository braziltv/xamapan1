
ALTER TABLE public.destinations ADD COLUMN guidance_phrase text NULL;

COMMENT ON COLUMN public.destinations.guidance_phrase IS 'Frase de orientação falada após o destino, ex: em caso de dúvidas siga a faixa branca';
