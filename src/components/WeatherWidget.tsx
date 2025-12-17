import { useEffect, useState, useRef, useCallback } from 'react';
import { Cloud, Droplets, Sun, CloudRain, CloudSnow, CloudLightning, Wind, CloudSun, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface WeatherData {
  current: {
    temperature: number;
    humidity: number;
    description: string;
    icon: string;
    windSpeed: number;
  };
  forecast: Array<{
    date: string;
    maxTemp: number;
    minTemp: number;
    icon: string;
  }>;
}

interface WeatherWidgetProps {
  currentTime?: Date;
  formatTime?: (date: Date, format: string) => string;
}

function getWeatherIcon(description: string, size: 'sm' | 'lg' = 'sm') {
  const desc = description.toLowerCase();
  const iconClass = size === 'lg' ? 'w-8 h-8' : 'w-4 h-4';
  
  if (desc.includes('sunny') || desc.includes('clear') || desc.includes('sol') || desc.includes('limpo')) 
    return <Sun className={`${iconClass} text-yellow-400 animate-[spin_8s_linear_infinite]`} />;
  if (desc.includes('partly') || desc.includes('parcialmente')) 
    return <CloudSun className={`${iconClass} text-yellow-300 animate-pulse`} />;
  if (desc.includes('rain') || desc.includes('shower') || desc.includes('chuva') || desc.includes('pancada')) 
    return <CloudRain className={`${iconClass} text-blue-400 animate-bounce`} />;
  if (desc.includes('thunder') || desc.includes('storm') || desc.includes('trovoada') || desc.includes('tempestade')) 
    return <CloudLightning className={`${iconClass} text-purple-400 animate-[pulse_0.5s_ease-in-out_infinite]`} />;
  if (desc.includes('snow') || desc.includes('neve')) 
    return <CloudSnow className={`${iconClass} text-white animate-[bounce_2s_ease-in-out_infinite]`} />;
  if (desc.includes('fog') || desc.includes('mist') || desc.includes('neblina') || desc.includes('nevoeiro')) 
    return <Wind className={`${iconClass} text-slate-400 animate-pulse`} />;
  if (desc.includes('cloud') || desc.includes('nublado') || desc.includes('encoberto')) 
    return <Cloud className={`${iconClass} text-slate-300 animate-pulse`} />;
  
  return <CloudSun className={`${iconClass} text-yellow-300 animate-pulse`} />;
}

const ALL_CITIES = [
  'Paineiras', 'Belo Horizonte', 'Uberlândia', 'Contagem', 'Juiz de Fora',
  'Betim', 'Montes Claros', 'Ribeirão das Neves', 'Uberaba', 'Governador Valadares',
  'Ipatinga', 'Sete Lagoas', 'Divinópolis', 'Santa Luzia', 'Poços de Caldas',
  'Patos de Minas', 'Pouso Alegre', 'Teófilo Otoni', 'Barbacena', 'Sabará',
  'Varginha', 'Conselheiro Lafaiete', 'Araguari', 'Itabira', 'Passos',
  'Coronel Fabriciano', 'Muriaé', 'Ituiutaba', 'Araxá', 'Lavras'
];

const OTHER_CITIES = ALL_CITIES.filter(c => c !== 'Paineiras');

export function WeatherWidget({ currentTime, formatTime }: WeatherWidgetProps) {
  const [weatherCache, setWeatherCache] = useState<Record<string, WeatherData>>({});
  const [displayCity, setDisplayCity] = useState('Paineiras');
  const [showMaxTemp, setShowMaxTemp] = useState(true);
  const [rotationCount, setRotationCount] = useState(0);
  const [otherCityIndex, setOtherCityIndex] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const fetchingRef = useRef(false);

  // Get current weather from cache
  const currentWeather = weatherCache[displayCity];

  // Load weather from database cache
  const loadWeatherFromDB = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const { data, error } = await supabase
        .from('weather_cache')
        .select('*');

      if (error) {
        console.error('Error loading weather cache:', error);
        return;
      }

      if (data && data.length > 0) {
        const newCache: Record<string, WeatherData> = {};
        data.forEach((item: { city_name: string; weather_data: unknown }) => {
          newCache[item.city_name] = item.weather_data as WeatherData;
        });
        setWeatherCache(newCache);
        setInitialLoading(false);
        console.log('Weather loaded from DB cache:', Object.keys(newCache).length, 'cities');
      } else {
        // Se não há dados no cache, chamar a edge function para popular
        console.log('No weather cache, triggering update...');
        await supabase.functions.invoke('update-cache');
        // Recarregar após alguns segundos
        setTimeout(() => {
          fetchingRef.current = false;
          loadWeatherFromDB();
        }, 5000);
        return;
      }
    } catch (err) {
      console.error('Error loading weather:', err);
    }

    fetchingRef.current = false;
  }, []);

  // Initial load from database
  useEffect(() => {
    loadWeatherFromDB();
    // Reload from DB every 5 minutes to get updated data
    const interval = setInterval(loadWeatherFromDB, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadWeatherFromDB]);

  // Rotate display city every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRotationCount(prev => {
        const next = prev + 1;
        // Every 5th rotation shows Paineiras
        if (next % 5 === 0) {
          setDisplayCity('Paineiras');
        } else {
          setOtherCityIndex(prevIdx => {
            const nextIdx = (prevIdx + 1) % OTHER_CITIES.length;
            setDisplayCity(OTHER_CITIES[nextIdx]);
            return nextIdx;
          });
        }
        return next;
      });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Alternate between min and max temp every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setShowMaxTemp(prev => !prev);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Clock section component
  const ClockSection = () => {
    if (!currentTime || !formatTime) return null;
    
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-baseline whitespace-nowrap">
          <span className="text-2xl font-mono font-black text-white tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
            {formatTime(currentTime, 'HH:mm')}
          </span>
          <span className="text-base font-mono font-bold text-amber-300 animate-pulse">
            :{formatTime(currentTime, 'ss')}
          </span>
        </div>
        <div className="text-center bg-white/10 rounded px-1.5 py-0.5">
          <p className="text-[10px] font-bold text-amber-300 leading-tight whitespace-nowrap uppercase">
            {formatTime(currentTime, "EEEE")}
          </p>
          <p className="text-[10px] font-semibold text-cyan-300 leading-tight whitespace-nowrap">
            {formatTime(currentTime, "dd/MM/yyyy")}
          </p>
        </div>
      </div>
    );
  };

  // Only show loading on initial load
  if (initialLoading && !currentWeather) {
    return (
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 backdrop-blur-xl rounded-xl px-4 py-3 shadow-2xl border border-white/10 overflow-hidden">
        <div className="flex items-center gap-3">
          <Cloud className="w-6 h-6 text-white/70 animate-pulse" />
          <span className="text-white/80 text-sm">Carregando previsões...</span>
          <ClockSection />
        </div>
      </div>
    );
  }

  // If no cached data for current city, show last available or fallback
  const weather = currentWeather || weatherCache['Paineiras'] || Object.values(weatherCache)[0];

  if (!weather) {
    return (
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 backdrop-blur-xl rounded-xl px-4 py-3 shadow-2xl border border-white/10 overflow-hidden">
        <div className="flex items-center gap-3">
          <Cloud className="w-6 h-6 text-white/50" />
          <span className="text-white/60 text-sm">Indisponível</span>
          <ClockSection />
        </div>
      </div>
    );
  }

  // Get max/min from forecast if available
  const todayForecast = weather.forecast?.[0];
  const maxTemp = todayForecast?.maxTemp ?? weather.current.temperature + 5;
  const minTemp = todayForecast?.minTemp ?? weather.current.temperature - 5;

  return (
    <div className="relative overflow-hidden">
      {/* Main container with glass effect */}
      <div className="bg-gradient-to-r from-indigo-900/90 via-purple-900/90 to-indigo-900/90 backdrop-blur-xl rounded-2xl px-4 py-3 shadow-2xl border border-white/20 relative">
        {/* Decorative glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/20 to-blue-500/10 rounded-2xl" />
        <div className="absolute top-0 left-1/4 w-1/2 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        
        <div className="flex items-center gap-4 relative z-10">
          {/* Clock Section */}
          <ClockSection />
          
          {/* Separator */}
          <div className="w-px h-10 bg-gradient-to-b from-transparent via-white/30 to-transparent" />
          
          {/* City & Weather Icon */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center justify-center">
              <span className="text-[9px] font-bold text-white/70 uppercase tracking-wider">Previsão</span>
              <div className="flex items-center gap-1 text-amber-300">
                <MapPin className="w-3 h-3 animate-bounce" />
                <span className="font-bold text-xs whitespace-nowrap">{displayCity}-MG</span>
              </div>
            </div>
            
            {/* Weather Icon with glow */}
            <div className="relative">
              <div className="absolute inset-0 bg-yellow-400/30 blur-xl rounded-full" />
              <div className="relative bg-white/10 rounded-xl p-2 backdrop-blur-sm border border-white/10">
                {getWeatherIcon(weather.current.description, 'lg')}
              </div>
            </div>
          </div>
          
          {/* Temperature Display */}
          <div className="flex flex-col items-center">
            <span className={`text-[9px] font-bold uppercase tracking-wider ${showMaxTemp ? 'text-orange-400' : 'text-cyan-400'}`}>
              {showMaxTemp ? 'Máxima' : 'Mínima'}
            </span>
            <div className="flex items-baseline">
              <span className="text-3xl font-black text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.3)]">
                {showMaxTemp ? maxTemp : minTemp}
              </span>
              <span className="text-lg font-bold text-amber-300">°C</span>
            </div>
          </div>
          
          {/* Humidity */}
          <div className="flex flex-col items-center bg-white/10 rounded-lg px-2 py-1 backdrop-blur-sm">
            <Droplets className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-white">{weather.current.humidity}%</span>
            <span className="text-[8px] text-white/60">Umidade</span>
          </div>
          
          {/* Separator */}
          <div className="w-px h-10 bg-gradient-to-b from-transparent via-white/30 to-transparent" />
          
          {/* Forecast Cards */}
          <div className="flex gap-2">
            {weather.forecast?.slice(0, 2).map((day, index) => {
              const date = new Date(day.date);
              const dayNames = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
              const dayName = index === 0 ? 'HOJE' : dayNames[date.getDay()];
              
              return (
                <div 
                  key={index} 
                  className={`${index === 0 ? 'bg-gradient-to-br from-amber-500/30 to-orange-600/30' : 'bg-white/10'} rounded-xl px-3 py-1.5 flex flex-col items-center backdrop-blur-sm border border-white/10`}
                >
                  <span className="text-[9px] font-bold text-white/90">{dayName}</span>
                  <div className="my-0.5">
                    {getWeatherIcon(day.icon || 'cloud', 'sm')}
                  </div>
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="text-cyan-300 font-semibold">{day.minTemp}°</span>
                    <span className="text-white/40">/</span>
                    <span className="text-orange-300 font-semibold">{day.maxTemp}°</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
