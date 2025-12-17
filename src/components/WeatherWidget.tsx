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
      <div className="flex items-center gap-2 ml-1">
        <div className="flex items-baseline whitespace-nowrap">
          <span className="text-xl font-mono font-black text-white tracking-tight">
            {formatTime(currentTime, 'HH:mm')}
          </span>
          <span className="text-sm font-mono font-bold text-yellow-400 animate-pulse">
            :{formatTime(currentTime, 'ss')}
          </span>
        </div>
        <div className="text-center">
          <p className="text-[9px] font-mono font-bold text-yellow-400 leading-tight whitespace-nowrap">
            {formatTime(currentTime, "EEE").toUpperCase()}
          </p>
          <p className="text-[9px] font-mono font-semibold text-cyan-400 leading-tight whitespace-nowrap">
            {formatTime(currentTime, "dd/MM")}
          </p>
        </div>
      </div>
    );
  };

  // Only show loading on initial load
  if (initialLoading && !currentWeather) {
    return (
      <div className="bg-red-800 backdrop-blur-md rounded-lg px-4 py-3 shadow-lg overflow-hidden">
        <div className="flex items-center gap-2">
          <Cloud className="w-5 h-5 text-white/70 animate-pulse" />
          <span className="text-white/80 text-xs">Carregando previsões...</span>
          <ClockSection />
        </div>
      </div>
    );
  }

  // If no cached data for current city, show last available or fallback
  const weather = currentWeather || weatherCache['Paineiras'] || Object.values(weatherCache)[0];

  if (!weather) {
    return (
      <div className="bg-red-800 backdrop-blur-md rounded-lg px-4 py-3 shadow-lg overflow-hidden">
        <div className="flex items-center gap-2">
          <Cloud className="w-5 h-5 text-white/50" />
          <span className="text-white/60 text-xs">Indisponível</span>
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
    <div className="bg-red-800 backdrop-blur-md rounded-lg px-3 py-2 shadow-lg overflow-hidden">
      <div className="flex items-center gap-3">
        {/* Clock first - moved to left */}
        <ClockSection />
        
        <div className="w-px h-8 bg-red-600/50" />
        
        {/* Current weather with city */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-center text-white text-xs font-poppins font-semibold drop-shadow-[0_0_6px_rgba(255,255,255,0.5)] leading-tight text-center min-w-[100px]">
            <span className="text-[10px]">Previsão do tempo</span>
            <span className="flex items-center gap-0.5 animate-pulse text-yellow-400 text-[10px]"><MapPin className="w-2.5 h-2.5 animate-bounce" />{displayCity}-MG</span>
          </div>
          {getWeatherIcon(weather.current.description, 'lg')}
          <div className="flex items-baseline gap-1 transition-all duration-500">
            <span className={`text-[8px] font-bold ${showMaxTemp ? 'text-orange-300' : 'text-cyan-300'}`}>
              {showMaxTemp ? 'MAX' : 'MIN'}
            </span>
            <span className="text-white font-black text-xl leading-none">
              {showMaxTemp ? maxTemp : minTemp}°<span className="text-yellow-400">c</span>
            </span>
          </div>
          <Droplets className="w-4 h-4 text-cyan-300 ml-1" />
          <span className="text-red-100 text-[9px]">{weather.current.humidity}%</span>
        </div>
        
        <div className="w-px h-8 bg-red-600/50" />
        
        {/* Forecast inline */}
        {weather.forecast?.slice(0, 2).map((day, index) => {
          const date = new Date(day.date);
          const dayNames = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
          const dayName = index === 0 ? 'HOJE' : dayNames[date.getDay()];
          
          return (
            <div 
              key={index} 
              className="bg-red-700 rounded-md px-2 py-1 flex items-center gap-1.5"
            >
              {getWeatherIcon(day.icon || 'cloud', 'sm')}
              <div className="text-[8px] leading-tight">
                <p className="text-white font-bold">{dayName}</p>
                <p className="text-red-100">{day.minTemp}°/{day.maxTemp}°</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
