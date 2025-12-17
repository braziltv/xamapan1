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
  const iconClass = size === 'lg' ? 'w-[2.5vw] h-[2.5vw] min-w-[28px] min-h-[28px]' : 'w-[1.2vw] h-[1.2vw] min-w-[14px] min-h-[14px]';
  
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

  const currentWeather = weatherCache[displayCity];

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
        console.log('No weather cache, triggering update...');
        await supabase.functions.invoke('update-cache');
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

  useEffect(() => {
    loadWeatherFromDB();
    const interval = setInterval(loadWeatherFromDB, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadWeatherFromDB]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRotationCount(prev => {
        const next = prev + 1;
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

  useEffect(() => {
    const interval = setInterval(() => {
      setShowMaxTemp(prev => !prev);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Clock section component - LARGER
  const ClockSection = () => {
    if (!currentTime || !formatTime) return null;
    
    return (
      <div className="flex items-center gap-[0.5vw] shrink-0">
        <div className="flex items-baseline whitespace-nowrap">
          <span className="font-mono font-black text-white tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" style={{ fontSize: 'clamp(2rem, 3.5vw, 4.5rem)' }}>
            {formatTime(currentTime, 'HH:mm')}
          </span>
          <span className="font-mono font-bold text-amber-300 animate-pulse" style={{ fontSize: 'clamp(1.2rem, 2vw, 2.5rem)' }}>
            :{formatTime(currentTime, 'ss')}
          </span>
        </div>
        <div className="text-center bg-white/10 rounded-lg px-[0.8vw] py-[0.5vh]">
          <p className="font-bold text-amber-300 leading-tight whitespace-nowrap uppercase" style={{ fontSize: 'clamp(0.7rem, 1.1vw, 1.3rem)' }}>
            {formatTime(currentTime, "EEEE")}
          </p>
          <p className="font-semibold text-cyan-300 leading-tight whitespace-nowrap" style={{ fontSize: 'clamp(0.7rem, 1.1vw, 1.3rem)' }}>
            {formatTime(currentTime, "dd/MM/yyyy")}
          </p>
        </div>
      </div>
    );
  };

  if (initialLoading && !currentWeather) {
    return (
      <div className="flex items-center gap-[1vw]">
        <Cloud className="w-8 h-8 text-white/70 animate-pulse" />
        <span className="text-white/80" style={{ fontSize: 'clamp(0.9rem, 1.2vw, 1.4rem)' }}>Carregando...</span>
        <ClockSection />
      </div>
    );
  }

  const weather = currentWeather || weatherCache['Paineiras'] || Object.values(weatherCache)[0];

  if (!weather) {
    return (
      <div className="flex items-center gap-[1vw]">
        <Cloud className="w-8 h-8 text-white/50" />
        <span className="text-white/60" style={{ fontSize: 'clamp(0.9rem, 1.2vw, 1.4rem)' }}>Indisponível</span>
        <ClockSection />
      </div>
    );
  }

  const todayForecast = weather.forecast?.[0];
  const maxTemp = todayForecast?.maxTemp ?? weather.current.temperature + 5;
  const minTemp = todayForecast?.minTemp ?? weather.current.temperature - 5;

  return (
    <div className="flex items-center gap-[1.5vw] flex-1 justify-end">
      {/* Clock Section - LARGER */}
      <ClockSection />
      
      {/* Separator */}
      <div className="w-px h-[5vh] bg-gradient-to-b from-transparent via-white/40 to-transparent shrink-0 ml-[0.5vw]" />
      
      {/* City & Weather Icon */}
      <div className="flex items-center gap-[0.6vw] shrink-0">
        <div className="flex flex-col items-center justify-center">
          <span className="font-bold text-white/70 uppercase tracking-wider" style={{ fontSize: 'clamp(0.55rem, 0.85vw, 1rem)' }}>Previsão</span>
          <div className="flex items-center gap-[0.3vw] text-amber-300">
            <MapPin className="w-[1.2vw] h-[1.2vw] min-w-[14px] min-h-[14px] animate-bounce shrink-0" />
            <span className="font-bold whitespace-nowrap" style={{ fontSize: 'clamp(0.7rem, 1.1vw, 1.3rem)' }}>{displayCity}-MG</span>
          </div>
        </div>
        
        {/* Weather Icon with glow */}
        <div className="relative shrink-0">
          <div className="absolute inset-0 bg-yellow-400/30 blur-xl rounded-full" />
          <div className="relative bg-white/10 rounded-xl p-[0.6vw] backdrop-blur-sm border border-white/10">
            {getWeatherIcon(weather.current.description, 'lg')}
          </div>
        </div>
      </div>
      
      {/* Current Temperature */}
      <div className="flex flex-col items-center bg-gradient-to-br from-emerald-500/30 to-teal-600/30 rounded-xl px-[1vw] py-[0.5vh] backdrop-blur-sm border border-white/10 shrink-0">
        <span className="font-bold text-emerald-300 uppercase tracking-wider" style={{ fontSize: 'clamp(0.55rem, 0.85vw, 1rem)' }}>Agora</span>
        <div className="flex items-baseline">
          <span className="font-black text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.3)] tabular-nums" style={{ fontSize: 'clamp(1.8rem, 3vw, 4rem)' }}>
            {weather.current.temperature}
          </span>
          <span className="font-bold text-emerald-300" style={{ fontSize: 'clamp(0.9rem, 1.3vw, 1.6rem)' }}>°C</span>
        </div>
        {weather.current.feelsLike !== undefined && weather.current.feelsLike !== weather.current.temperature && (
          <span className="text-white/70 whitespace-nowrap" style={{ fontSize: 'clamp(0.5rem, 0.7vw, 0.85rem)' }}>
            Sensação: <span className="font-bold text-amber-300 tabular-nums">{weather.current.feelsLike}°</span>
          </span>
        )}
      </div>
      
      {/* Max/Min Temperature Display */}
      <div className="flex flex-col items-center shrink-0">
        <span className={`font-bold uppercase tracking-wider ${showMaxTemp ? 'text-orange-400' : 'text-cyan-400'}`} style={{ fontSize: 'clamp(0.55rem, 0.85vw, 1rem)' }}>
          {showMaxTemp ? 'Máxima' : 'Mínima'}
        </span>
        <div className="flex items-baseline">
          <span className="font-black text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.3)] tabular-nums" style={{ fontSize: 'clamp(1.8rem, 3vw, 4rem)' }}>
            {showMaxTemp ? maxTemp : minTemp}
          </span>
          <span className="font-bold text-amber-300" style={{ fontSize: 'clamp(0.9rem, 1.3vw, 1.6rem)' }}>°C</span>
        </div>
      </div>
      
      {/* Humidity */}
      <div className="flex flex-col items-center bg-white/10 rounded-lg px-[0.8vw] py-[0.5vh] backdrop-blur-sm shrink-0">
        <Droplets className="w-[1.5vw] h-[1.5vw] min-w-[18px] min-h-[18px] text-cyan-400 shrink-0" />
        <span className="font-bold text-white tabular-nums" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.8rem)' }}>{weather.current.humidity}%</span>
        <span className="text-white/60" style={{ fontSize: 'clamp(0.45rem, 0.65vw, 0.8rem)' }}>Umidade</span>
      </div>
      
      {/* Separator */}
      <div className="w-px h-[5vh] bg-gradient-to-b from-transparent via-white/40 to-transparent shrink-0" />
      
      {/* Forecast Cards */}
      <div className="flex gap-[0.6vw] shrink-0">
        {weather.forecast?.slice(0, 2).map((day, index) => {
          const date = new Date(day.date);
          const dayNames = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
          const dayName = index === 0 ? 'HOJE' : dayNames[date.getDay()];
          
          return (
            <div 
              key={index} 
              className={`${index === 0 ? 'bg-gradient-to-br from-amber-500/30 to-orange-600/30' : 'bg-white/10'} rounded-xl px-[0.8vw] py-[0.5vh] flex flex-col items-center backdrop-blur-sm border border-white/10`}
            >
              <span className="font-bold text-white/90" style={{ fontSize: 'clamp(0.55rem, 0.85vw, 1rem)' }}>{dayName}</span>
              <div className="my-[0.3vh]">
                {getWeatherIcon(day.icon || 'cloud', 'sm')}
              </div>
              <div className="flex items-center gap-[0.3vw]">
                <span className="text-cyan-300 font-semibold tabular-nums" style={{ fontSize: 'clamp(0.6rem, 0.9vw, 1.1rem)' }}>{day.minTemp}°</span>
                <span className="text-white/40">/</span>
                <span className="text-orange-300 font-semibold tabular-nums" style={{ fontSize: 'clamp(0.6rem, 0.9vw, 1.1rem)' }}>{day.maxTemp}°</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
