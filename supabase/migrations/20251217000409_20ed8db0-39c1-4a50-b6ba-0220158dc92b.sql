-- Tabela para cache de previsão do tempo
CREATE TABLE public.weather_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city_name text NOT NULL UNIQUE,
  weather_data jsonb NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela para cache de notícias
CREATE TABLE public.news_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source text NOT NULL,
  title text NOT NULL,
  link text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index para busca rápida
CREATE INDEX idx_news_cache_created_at ON public.news_cache(created_at DESC);
CREATE INDEX idx_weather_cache_city ON public.weather_cache(city_name);

-- Enable RLS
ALTER TABLE public.weather_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_cache ENABLE ROW LEVEL SECURITY;

-- Políticas públicas (leitura para todos)
CREATE POLICY "Anyone can view weather cache" ON public.weather_cache FOR SELECT USING (true);
CREATE POLICY "Anyone can view news cache" ON public.news_cache FOR SELECT USING (true);

-- Políticas para service role (inserção/atualização/deleção)
CREATE POLICY "Service can manage weather cache" ON public.weather_cache FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service can manage news cache" ON public.news_cache FOR ALL USING (true) WITH CHECK (true);