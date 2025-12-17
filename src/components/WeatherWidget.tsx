import { useEffect, useState, useRef, useCallback } from 'react';
import { Cloud, Droplets, Sun, CloudRain, CloudSnow, CloudLightning, Wind, CloudSun, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface WeatherData {
  current: {
    temperature: number;
    feelsLike?: number;
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
      <div className="flex items-center gap-[0.8vw] shrink-0">
        <div className="flex items-baseline whitespace-nowrap">
          <span className="font-mono font-black text-white tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" style={{ fontSize: 'clamp(1.5rem, 2.5vw, 3rem)' }}>
            {formatTime(currentTime, 'HH:mm')}
          </span>
          <span className="font-mono font-bold text-amber-300 animate-pulse" style={{ fontSize: 'clamp(1rem, 1.5vw, 2rem)' }}>
            :{formatTime(currentTime, 'ss')}
          </span>
        </div>
        <div className="text-center bg-white/10 rounded-lg px-[0.6vw] py-[0.3vh]">
          <p className="font-bold text-amber-300 leading-tight whitespace-nowrap uppercase" style={{ fontSize: 'clamp(0.5rem, 0.8vw, 0.9rem)' }}>
            {formatTime(currentTime, "EEEE")}
          </p>
          <p className="font-semibold text-cyan-300 leading-tight whitespace-nowrap" style={{ fontSize: 'clamp(0.5rem, 0.8vw, 0.9rem)' }}>
            {formatTime(currentTime, "dd/MM/yyyy")}
          </p>
        </div>
      </div>
    );
  };

  // Only show loading on initial load
  if (initialLoading && !currentWeather) {
    return (
      <div className="flex items-center gap-[1vw]">
        <Cloud className="w-6 h-6 text-white/70 animate-pulse" />
        <span className="text-white/80 text-sm">Carregando...</span>
        <ClockSection />
      </div>
    );
  }

  // If no cached data for current city, show last available or fallback
  const weather = currentWeather || weatherCache['Paineiras'] || Object.values(weatherCache)[0];

  if (!weather) {
    return (
      <div className="flex items-center gap-[1vw]">
        <Cloud className="w-6 h-6 text-white/50" />
        <span className="text-white/60 text-sm">Indisponível</span>
        <ClockSection />
      </div>
    );
  }

  // Get max/min from forecast if available
  const todayForecast = weather.forecast?.[0];
  const maxTemp = todayForecast?.maxTemp ?? weather.current.temperature + 5;
  const minTemp = todayForecast?.minTemp ?? weather.current.temperature - 5;

  return (
    <div className="flex items-center gap-[1.2vw] flex-wrap justify-end">
      {/* Clock Section */}
      <ClockSection />
      
      {/* Separator */}
      <div className="w-px h-[4vh] bg-gradient-to-b from-transparent via-white/30 to-transparent shrink-0" />
      
      {/* City & Weather Icon */}
      <div className="flex items-center gap-[0.8vw] shrink-0">
        <div className="flex flex-col items-center justify-center">
          <span className="font-bold text-white/70 uppercase tracking-wider" style={{ fontSize: 'clamp(0.45rem, 0.7vw, 0.8rem)' }}>Previsão</span>
          <div className="flex items-center gap-[0.3vw] text-amber-300">
            <MapPin className="w-[1vw] h-[1vw] min-w-[12px] min-h-[12px] animate-bounce shrink-0" />
            <span className="font-bold whitespace-nowrap" style={{ fontSize: 'clamp(0.55rem, 0.9vw, 1rem)' }}>{displayCity}-MG</span>
          </div>
        </div>
        
        {/* Weather Icon with glow */}
        <div className="relative shrink-0">
          <div className="absolute inset-0 bg-yellow-400/30 blur-xl rounded-full" />
          <div className="relative bg-white/10 rounded-xl p-[0.5vw] backdrop-blur-sm border border-white/10">
            {getWeatherIcon(weather.current.description, 'lg')}
          </div>
        </div>
      </div>
      
      {/* Current Temperature */}
      <div className="flex flex-col items-center bg-gradient-to-br from-emerald-500/30 to-teal-600/30 rounded-xl px-[0.8vw] py-[0.4vh] backdrop-blur-sm border border-white/10 shrink-0">
        <span className="font-bold text-emerald-300 uppercase tracking-wider" style={{ fontSize: 'clamp(0.45rem, 0.7vw, 0.8rem)' }}>Agora</span>
        <div className="flex items-baseline">
          <span className="font-black text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.3)] tabular-nums" style={{ fontSize: 'clamp(1.3rem, 2.2vw, 2.8rem)' }}>
            {weather.current.temperature}
          </span>
          <span className="font-bold text-emerald-300" style={{ fontSize: 'clamp(0.7rem, 1vw, 1.2rem)' }}>°C</span>
        </div>
        {weather.current.feelsLike !== undefined && weather.current.feelsLike !== weather.current.temperature && (
          <span className="text-white/70 whitespace-nowrap" style={{ fontSize: 'clamp(0.4rem, 0.6vw, 0.7rem)' }}>
            Sensação: <span className="font-bold text-amber-300 tabular-nums">{weather.current.feelsLike}°</span>
          </span>
        )}
      </div>
      
      {/* Max/Min Temperature Display */}
      <div className="flex flex-col items-center shrink-0">
        <span className={`font-bold uppercase tracking-wider ${showMaxTemp ? 'text-orange-400' : 'text-cyan-400'}`} style={{ fontSize: 'clamp(0.45rem, 0.7vw, 0.8rem)' }}>
          {showMaxTemp ? 'Máxima' : 'Mínima'}
        </span>
        <div className="flex items-baseline">
          <span className="font-black text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.3)] tabular-nums" style={{ fontSize: 'clamp(1.3rem, 2.2vw, 2.8rem)' }}>
            {showMaxTemp ? maxTemp : minTemp}
          </span>
          <span className="font-bold text-amber-300" style={{ fontSize: 'clamp(0.7rem, 1vw, 1.2rem)' }}>°C</span>
        </div>
      </div>
      
      {/* Humidity */}
      <div className="flex flex-col items-center bg-white/10 rounded-lg px-[0.6vw] py-[0.4vh] backdrop-blur-sm shrink-0">
        <Droplets className="w-[1.2vw] h-[1.2vw] min-w-[14px] min-h-[14px] text-cyan-400 shrink-0" />
        <span className="font-bold text-white tabular-nums" style={{ fontSize: 'clamp(0.7rem, 1.1vw, 1.3rem)' }}>{weather.current.humidity}%</span>
        <span className="text-white/60" style={{ fontSize: 'clamp(0.4rem, 0.55vw, 0.65rem)' }}>Umidade</span>
      </div>
      
      {/* Separator */}
      <div className="w-px h-[4vh] bg-gradient-to-b from-transparent via-white/30 to-transparent shrink-0" />
      
      {/* Forecast Cards */}
      <div className="flex gap-[0.8vw] shrink-0">
        {weather.forecast?.slice(0, 2).map((day, index) => {
          const dayNames = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
          // Use currentTime to calculate day names based on today
          const today = currentTime || new Date();
          const targetDate = new Date(today);
          targetDate.setDate(targetDate.getDate() + index);
          const dayName = index === 0 ? 'HOJE' : dayNames[targetDate.getDay()];
          
          return (
            <div 
              key={index} 
              className={`${index === 0 ? 'bg-gradient-to-br from-amber-500/30 to-orange-600/30' : 'bg-white/10'} rounded-xl px-[1vw] py-[0.6vh] flex flex-col items-center backdrop-blur-sm border border-white/20 min-w-[4vw]`}
            >
              <span className="font-bold text-white" style={{ fontSize: 'clamp(0.6rem, 0.9vw, 1rem)' }}>{dayName}</span>
              <div className="my-[0.4vh]">
                {getWeatherIcon(day.icon || 'cloud', 'lg')}
              </div>
              <div className="flex items-center gap-[0.4vw]">
                <span className="text-cyan-300 font-bold tabular-nums" style={{ fontSize: 'clamp(0.65rem, 1vw, 1.1rem)' }}>{day.minTemp}°</span>
                <span className="text-white/50 font-bold">/</span>
                <span className="text-orange-300 font-bold tabular-nums" style={{ fontSize: 'clamp(0.65rem, 1vw, 1.1rem)' }}>{day.maxTemp}°</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
