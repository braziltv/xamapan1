import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cidades de Minas Gerais com coordenadas para previsão do tempo
// Cidades de Minas Gerais com nomes simples (sem nomes compostos)
const cityCoordinates: { [city: string]: { lat: number; lon: number } } = {
  'Paineiras': { lat: -19.26, lon: -45.52 },
  'Biquinhas': { lat: -18.79, lon: -45.50 },
  'Curvelo': { lat: -18.76, lon: -44.43 },
  'Pompéu': { lat: -19.22, lon: -45.00 },
  'Luz': { lat: -19.79, lon: -45.68 },
  'Uberlândia': { lat: -18.92, lon: -48.28 },
  'Contagem': { lat: -19.93, lon: -44.05 },
  'Betim': { lat: -19.97, lon: -44.20 },
  'Uberaba': { lat: -19.75, lon: -47.93 },
  'Ipatinga': { lat: -19.47, lon: -42.54 },
  'Divinópolis': { lat: -20.14, lon: -44.88 },
  'Barbacena': { lat: -21.23, lon: -43.77 },
  'Sabará': { lat: -19.88, lon: -43.81 },
  'Varginha': { lat: -21.55, lon: -45.43 },
  'Araguari': { lat: -18.65, lon: -48.19 },
  'Itabira': { lat: -19.62, lon: -43.23 },
  'Passos': { lat: -20.72, lon: -46.61 },
  'Muriaé': { lat: -21.13, lon: -42.37 },
  'Ituiutaba': { lat: -18.97, lon: -49.46 },
  'Araxá': { lat: -19.59, lon: -46.94 },
  'Lavras': { lat: -21.25, lon: -45.00 },
};

const cities = Object.keys(cityCoordinates);

// Feeds de notícias ATIVOS (apenas os que funcionam)
const feeds = [
  // G1 - Portal de notícias (principal fonte)
  { url: 'https://g1.globo.com/dynamo/rss2.xml', source: 'G1' },
  { url: 'https://g1.globo.com/dynamo/brasil/rss2.xml', source: 'G1' },
  { url: 'https://g1.globo.com/dynamo/minas-gerais/rss2.xml', source: 'G1' },
  { url: 'https://g1.globo.com/dynamo/economia/rss2.xml', source: 'G1' },
  { url: 'https://g1.globo.com/dynamo/tecnologia/rss2.xml', source: 'G1' },
  { url: 'https://g1.globo.com/dynamo/ciencia-e-saude/rss2.xml', source: 'G1' },
  { url: 'https://g1.globo.com/dynamo/educacao/rss2.xml', source: 'G1' },
  { url: 'https://g1.globo.com/dynamo/pop-arte/rss2.xml', source: 'G1' },
  // Esportes
  { url: 'https://ge.globo.com/dynamo/rss2.xml', source: 'GE' },
  { url: 'https://www.espn.com.br/rss/', source: 'ESPN' },
  // Folha de S.Paulo
  { url: 'https://feeds.folha.uol.com.br/emcimadahora/rss091.xml', source: 'Folha' },
  { url: 'https://feeds.folha.uol.com.br/cotidiano/rss091.xml', source: 'Folha' },
  // Portais ativos
  { url: 'https://www.cnnbrasil.com.br/feed/', source: 'CNN' },
  { url: 'https://www.metropoles.com/feed', source: 'Metrópoles' },
  { url: 'https://exame.com/feed/', source: 'Exame' },
  // Tecnologia
  { url: 'https://olhardigital.com.br/feed/', source: 'Olhar Digital' },
  { url: 'https://canaltech.com.br/rss/', source: 'Canaltech' },
  { url: 'https://tecnoblog.net/feed/', source: 'Tecnoblog' },
  // Economia
  { url: 'https://www.infomoney.com.br/feed/', source: 'InfoMoney' },
  // Saúde
  { url: 'https://saude.ig.com.br/rss.xml', source: 'iG Saúde' },
  // Notícias gerais
  { url: 'https://news.un.org/feed/subscribe/pt/news/region/americas/feed/rss.xml', source: 'ONU News' },
  { url: 'https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml', source: 'Agência Brasil' },
  // Ciência e Tecnologia
  { url: 'https://www.inovacaotecnologica.com.br/boletim/rss.xml', source: 'Inovação Tec' },
  // Jornalismo investigativo
  { url: 'https://www.intercept.com.br/feed/', source: 'Intercept' },
  // Internacional
  { url: 'https://operamundi.uol.com.br/feed/', source: 'Opera Mundi' },
  // Notícias rápidas
  { url: 'https://www.noticiasaominuto.com.br/rss/ultima-hora', source: 'Notícias ao Minuto' },
];

// Decodificar entidades HTML
function decodeHTMLEntities(text: string): string {
  const entities: { [key: string]: string } = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'",
    '&apos;': "'", '&nbsp;': ' ', '&#x27;': "'", '&#x2F;': '/',
    '&eacute;': 'é', '&Eacute;': 'É', '&aacute;': 'á', '&Aacute;': 'Á',
    '&iacute;': 'í', '&Iacute;': 'Í', '&oacute;': 'ó', '&Oacute;': 'Ó',
    '&uacute;': 'ú', '&Uacute;': 'Ú', '&atilde;': 'ã', '&Atilde;': 'Ã',
    '&otilde;': 'õ', '&Otilde;': 'Õ', '&ccedil;': 'ç', '&Ccedil;': 'Ç',
    '&agrave;': 'à', '&Agrave;': 'À', '&ecirc;': 'ê', '&Ecirc;': 'Ê',
    '&ocirc;': 'ô', '&Ocirc;': 'Ô', '&uuml;': 'ü', '&Uuml;': 'Ü',
    '&ntilde;': 'ñ', '&Ntilde;': 'Ñ', '&ordm;': 'º', '&ordf;': 'ª',
  };
  
  let decoded = text;
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, 'g'), char);
  }
  decoded = decoded.replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)));
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  return decoded;
}

async function fetchWeatherForCity(city: string, retryCount = 0): Promise<any | null> {
  try {
    const coords = cityCoordinates[city];
    if (!coords) {
      console.error(`No coordinates for city: ${city}`);
      return null;
    }
    
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=America/Sao_Paulo&forecast_days=3`,
      { signal: AbortSignal.timeout(15000) }
    );
    
    if (!response.ok) {
      // Retry up to 2 times on failure
      if (retryCount < 2) {
        console.log(`Retrying weather fetch for ${city}, attempt ${retryCount + 2}`);
        await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)));
        return fetchWeatherForCity(city, retryCount + 1);
      }
      return null;
    }
    
    const data = await response.json();
    
    const weatherCodes: { [key: number]: { description: string; icon: string } } = {
      0: { description: 'Céu limpo', icon: '☀️' },
      1: { description: 'Principalmente limpo', icon: '🌤️' },
      2: { description: 'Parcialmente nublado', icon: '⛅' },
      3: { description: 'Nublado', icon: '☁️' },
      45: { description: 'Neblina', icon: '🌫️' },
      48: { description: 'Neblina com geada', icon: '🌫️' },
      51: { description: 'Garoa leve', icon: '🌦️' },
      53: { description: 'Garoa moderada', icon: '🌦️' },
      55: { description: 'Garoa intensa', icon: '🌧️' },
      61: { description: 'Chuva leve', icon: '🌧️' },
      63: { description: 'Chuva moderada', icon: '🌧️' },
      65: { description: 'Chuva forte', icon: '🌧️' },
      71: { description: 'Neve leve', icon: '🌨️' },
      73: { description: 'Neve moderada', icon: '🌨️' },
      75: { description: 'Neve forte', icon: '❄️' },
      80: { description: 'Pancadas leves', icon: '🌦️' },
      81: { description: 'Pancadas moderadas', icon: '🌧️' },
      82: { description: 'Pancadas fortes', icon: '⛈️' },
      95: { description: 'Tempestade', icon: '⛈️' },
      96: { description: 'Tempestade com granizo', icon: '⛈️' },
      99: { description: 'Tempestade severa', icon: '⛈️' },
    };
    
    const currentCode = data.current?.weather_code || 0;
    const weather = weatherCodes[currentCode] || { description: 'Desconhecido', icon: '❓' };
    
    return {
      current: {
        temperature: Math.round(data.current?.temperature_2m || 0),
        feelsLike: Math.round(data.current?.apparent_temperature || data.current?.temperature_2m || 0),
        description: weather.description,
        icon: weather.icon,
        humidity: data.current?.relative_humidity_2m || 0,
        windSpeed: Math.round(data.current?.wind_speed_10m || 0),
      },
      forecast: data.daily?.time?.slice(0, 3).map((date: string, i: number) => ({
        date,
        maxTemp: Math.round(data.daily.temperature_2m_max[i]),
        minTemp: Math.round(data.daily.temperature_2m_min[i]),
        icon: weatherCodes[data.daily.weather_code[i]]?.icon || '❓',
      })) || [],
    };
  } catch (error) {
    console.error(`Error fetching weather for ${city}:`, error);
    return null;
  }
}

async function fetchNewsFromFeed(feed: { url: string; source: string }): Promise<Array<{ title: string; link: string; source: string }>> {
  try {
    const response = await fetch(feed.url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000),
    });
    
    if (!response.ok) return [];
    
    // Get the raw bytes first
    const buffer = await response.arrayBuffer();
    
    // Try to detect encoding from content-type header or XML declaration
    const contentType = response.headers.get('content-type') || '';
    let encoding = 'utf-8';
    
    // Check content-type header for charset
    const charsetMatch = contentType.match(/charset=([^;]+)/i);
    if (charsetMatch) {
      encoding = charsetMatch[1].toLowerCase().trim();
    }
    
    // Decode with the detected encoding
    let text: string;
    try {
      // Handle ISO-8859-1 / Latin-1 encoding (common in Brazilian feeds like Folha)
      if (encoding === 'iso-8859-1' || encoding === 'latin1' || encoding === 'latin-1') {
        const decoder = new TextDecoder('iso-8859-1');
        text = decoder.decode(buffer);
      } else {
        // Default to UTF-8
        const decoder = new TextDecoder('utf-8');
        text = decoder.decode(buffer);
      }
      
      // Also check XML declaration for encoding
      const xmlEncodingMatch = text.match(/<\?xml[^>]+encoding=["']([^"']+)["']/i);
      if (xmlEncodingMatch) {
        const xmlEncoding = xmlEncodingMatch[1].toLowerCase();
        if ((xmlEncoding === 'iso-8859-1' || xmlEncoding === 'latin1') && encoding === 'utf-8') {
          // Re-decode with correct encoding
          const decoder = new TextDecoder('iso-8859-1');
          text = decoder.decode(buffer);
        }
      }
    } catch {
      // Fallback to simple UTF-8
      text = new TextDecoder().decode(buffer);
    }
    
    const items: Array<{ title: string; link: string; source: string }> = [];
    
    const itemMatches = text.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || [];
    
    for (const item of itemMatches.slice(0, 4)) {
      const titleMatch = item.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
      const linkMatch = item.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
      
      if (titleMatch && linkMatch) {
        let title = decodeHTMLEntities(titleMatch[1].trim());
        title = title.replace(/<[^>]+>/g, '').trim();
        
        if (title && title.length > 10 && title.length < 200) {
          items.push({
            title,
            link: linkMatch[1].trim(),
            source: feed.source,
          });
        }
      }
    }
    
    return items;
  } catch (error) {
    console.error(`Error fetching news from ${feed.source}:`, error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Health check endpoint
    const body = await req.json().catch(() => ({}));
    if (body.healthCheck === true) {
      return new Response(
        JSON.stringify({ 
          status: 'healthy', 
          service: 'update-cache',
          timestamp: new Date().toISOString(),
          cities: cities.length,
          feeds: feeds.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // TTL throttle: skip refresh if both caches were updated < 30 min ago (unless force=true)
    const TTL_MINUTES = 30;
    const force = body.force === true;
    if (!force) {
      const cutoff = new Date(Date.now() - TTL_MINUTES * 60 * 1000).toISOString();
      const [weatherFresh, newsFresh] = await Promise.all([
        supabase.from('weather_cache').select('updated_at').gte('updated_at', cutoff).limit(1),
        supabase.from('news_cache').select('created_at').gte('created_at', cutoff).limit(1),
      ]);
      const hasFreshWeather = (weatherFresh.data?.length ?? 0) > 0;
      const hasFreshNews = (newsFresh.data?.length ?? 0) > 0;
      if (hasFreshWeather && hasFreshNews) {
        console.log(`Cache fresh (<${TTL_MINUTES}min). Skipping refresh.`);
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: 'cache_fresh', ttl_minutes: TTL_MINUTES }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('Starting cache update...');
    console.log(`Total cities to process: ${cities.length}`);
    
    // Processar cidades em lotes menores para evitar timeout e rate limiting
    const BATCH_SIZE = 5;
    const DELAY_BETWEEN_BATCHES = 500; // 500ms entre lotes
    const allWeatherResults: Array<{ city_name: string; weather_data: any }> = [];
    
    for (let i = 0; i < cities.length; i += BATCH_SIZE) {
      const batch = cities.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(cities.length / BATCH_SIZE)}: ${batch.join(', ')}`);
      
      const batchPromises = batch.map(async (city) => {
        try {
          const weatherData = await fetchWeatherForCity(city);
          if (weatherData) {
            return { city_name: city, weather_data: weatherData };
          }
          console.warn(`No weather data for ${city}`);
          return null;
        } catch (err) {
          console.error(`Error fetching weather for ${city}:`, err);
          return null;
        }
      });
      
      const batchResults = (await Promise.all(batchPromises)).filter(Boolean) as Array<{ city_name: string; weather_data: any }>;
      allWeatherResults.push(...batchResults);
      
      // Delay entre lotes para evitar rate limiting
      if (i + BATCH_SIZE < cities.length) {
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_BATCHES));
      }
    }
    
    console.log(`Successfully fetched weather for ${allWeatherResults.length}/${cities.length} cities`);
    
    if (allWeatherResults.length > 0) {
      // Usar upsert para atualizar dados existentes e inserir novos
      // NÃO deletar dados antigos para evitar perda de dados em caso de falha parcial
      const { error: weatherError } = await supabase
        .from('weather_cache')
        .upsert(
          allWeatherResults.map(w => ({
            city_name: w.city_name,
            weather_data: w.weather_data,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: 'city_name' }
        );
      
      if (weatherError) {
        console.error('Error saving weather cache:', weatherError);
      } else {
        console.log(`Weather cache updated for ${allWeatherResults.length} cities`);
      }
      
      // Limpar cidades que não existem mais na lista (foram removidas)
      const validCityNames = cities;
      const { error: cleanupError } = await supabase
        .from('weather_cache')
        .delete()
        .not('city_name', 'in', `(${validCityNames.map(c => `"${c}"`).join(',')})`);
      
      if (cleanupError) {
        console.error('Error cleaning up old cities:', cleanupError);
      }
    }
    
    // Buscar notícias de TODOS os feeds (não apenas alguns aleatórios)
    console.log(`Fetching news from all ${feeds.length} feeds...`);
    const newsPromises = feeds.map(feed => fetchNewsFromFeed(feed));
    const newsResults = await Promise.all(newsPromises);
    const allNews = newsResults.flat();
    
    // Remover notícias duplicadas por título (normalizado)
    const seenTitles = new Set<string>();
    const uniqueNews = allNews.filter(news => {
      // Normalizar título para comparação (lowercase, sem espaços extras, sem pontuação)
      const normalizedTitle = news.title
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Verificar se título similar já existe (usando primeiras 50 chars para evitar pequenas variações)
      const titleKey = normalizedTitle.substring(0, 50);
      
      if (seenTitles.has(titleKey)) {
        return false;
      }
      seenTitles.add(titleKey);
      return true;
    });
    
    // Embaralhar notícias para diversidade na exibição
    const shuffledNews = uniqueNews.sort(() => Math.random() - 0.5);
    
    console.log(`Total news fetched: ${allNews.length}, unique after dedup: ${shuffledNews.length}`);
    
    if (shuffledNews.length > 0) {
      // Limpar cache antigo de notícias
      await supabase.from('news_cache').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // Inserir novas notícias únicas
      const { error: newsError } = await supabase
        .from('news_cache')
        .insert(
          shuffledNews.map(n => ({
            source: n.source,
            title: n.title,
            link: n.link,
          }))
        );
      
      if (newsError) {
        console.error('Error saving news cache:', newsError);
      } else {
        console.log(`News cache updated with ${shuffledNews.length} unique items from ${feeds.length} feeds`);
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        weather_count: allWeatherResults.length,
        weather_total_cities: cities.length,
        news_total_fetched: allNews.length,
        news_unique_saved: shuffledNews.length,
        feeds_processed: feeds.length,
        updated_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in update-cache:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
