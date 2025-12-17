import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cidades de Minas Gerais para previsão do tempo
const cities = [
  'Paineiras', 'Belo Horizonte', 'Uberlândia', 'Contagem', 'Juiz de Fora',
  'Betim', 'Montes Claros', 'Ribeirão das Neves', 'Uberaba', 'Governador Valadares',
  'Ipatinga', 'Sete Lagoas', 'Divinópolis', 'Santa Luzia', 'Poços de Caldas',
  'Patos de Minas', 'Pouso Alegre', 'Teófilo Otoni', 'Barbacena', 'Sabará',
  'Varginha', 'Conselheiro Lafaiete', 'Araguari', 'Itabira', 'Passos',
  'Coronel Fabriciano', 'Muriaé', 'Ituiutaba', 'Araxá', 'Lavras'
];

// Feeds de notícias
const feeds = [
  { url: 'https://g1.globo.com/dynamo/rss2.xml', source: 'G1' },
  { url: 'https://g1.globo.com/dynamo/brasil/rss2.xml', source: 'G1' },
  { url: 'https://g1.globo.com/dynamo/minas-gerais/rss2.xml', source: 'G1' },
  { url: 'https://g1.globo.com/dynamo/economia/rss2.xml', source: 'G1' },
  { url: 'https://ge.globo.com/dynamo/rss2.xml', source: 'GE' },
  { url: 'https://www.espn.com.br/rss/', source: 'ESPN' },
  { url: 'https://feeds.folha.uol.com.br/emcimadahora/rss091.xml', source: 'Folha' },
  { url: 'https://feeds.folha.uol.com.br/cotidiano/rss091.xml', source: 'Folha' },
  { url: 'https://news.google.com/rss?hl=pt-BR&gl=BR&ceid=BR:pt-419', source: 'Google' },
  { url: 'https://www.cnnbrasil.com.br/feed/', source: 'CNN' },
  { url: 'https://www.metropoles.com/feed', source: 'Metrópoles' },
  { url: 'https://rss.tecmundo.com.br/feed', source: 'Tecmundo' },
  { url: 'https://olhardigital.com.br/feed/', source: 'Olhar Digital' },
  { url: 'https://canaltech.com.br/rss/', source: 'Canaltech' },
  { url: 'https://www.infomoney.com.br/feed/', source: 'InfoMoney' },
  { url: 'https://exame.com/feed/', source: 'Exame' },
  { url: 'https://noticias.r7.com/feed.xml', source: 'R7' },
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

async function fetchWeatherForCity(city: string): Promise<any | null> {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=-19.9&longitude=-44.0&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=America/Sao_Paulo&forecast_days=3`,
      { signal: AbortSignal.timeout(10000) }
    );
    
    if (!response.ok) return null;
    
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
    
    const text = await response.text();
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('Starting cache update...');
    
    // Atualizar previsão do tempo para todas as cidades
    console.log('Fetching weather for all cities...');
    const weatherPromises = cities.map(async (city) => {
      const weatherData = await fetchWeatherForCity(city);
      if (weatherData) {
        return { city_name: city, weather_data: weatherData };
      }
      return null;
    });
    
    const weatherResults = (await Promise.all(weatherPromises)).filter(Boolean);
    
    if (weatherResults.length > 0) {
      // Limpar cache antigo de clima
      await supabase.from('weather_cache').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // Inserir novos dados
      const { error: weatherError } = await supabase
        .from('weather_cache')
        .upsert(
          weatherResults.map(w => ({
            city_name: w!.city_name,
            weather_data: w!.weather_data,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: 'city_name' }
        );
      
      if (weatherError) {
        console.error('Error saving weather cache:', weatherError);
      } else {
        console.log(`Weather cache updated for ${weatherResults.length} cities`);
      }
    }
    
    // Buscar notícias de todos os feeds (8 feeds aleatórios)
    console.log('Fetching news from feeds...');
    const shuffledFeeds = [...feeds].sort(() => Math.random() - 0.5).slice(0, 8);
    const newsPromises = shuffledFeeds.map(feed => fetchNewsFromFeed(feed));
    const newsResults = await Promise.all(newsPromises);
    const allNews = newsResults.flat();
    
    if (allNews.length > 0) {
      // Limpar cache antigo de notícias
      await supabase.from('news_cache').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // Inserir novas notícias
      const { error: newsError } = await supabase
        .from('news_cache')
        .insert(
          allNews.map(n => ({
            source: n.source,
            title: n.title,
            link: n.link,
          }))
        );
      
      if (newsError) {
        console.error('Error saving news cache:', newsError);
      } else {
        console.log(`News cache updated with ${allNews.length} items`);
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        weather_count: weatherResults.length,
        news_count: allNews.length,
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
