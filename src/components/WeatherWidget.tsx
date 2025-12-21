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

// Cities are dynamically loaded from the database cache

export function WeatherWidget({ currentTime, formatTime }: WeatherWidgetProps) {
  const [weatherCache, setWeatherCache] = useState<Record<string, WeatherData>>({});
  const [displayCity, setDisplayCity] = useState('Paineiras');
  const [showMaxTemp, setShowMaxTemp] = useState(true);
  const [rotationCount, setRotationCount] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const fetchingRef = useRef(false);

  // Get available cities from cache (only show cities that have data)
  const availableCities = Object.keys(weatherCache);
  const otherCities = availableCities.filter(c => c !== 'Paineiras');

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

  // Rotate display city every 10 seconds (only among cities in cache)
  useEffect(() => {
    if (availableCities.length === 0) return;
    
    let currentIndex = 0;
    
    const interval = setInterval(() => {
      setRotationCount(prev => {
        const next = prev + 1;
        // Every 5th rotation shows Paineiras (if available)
        if (next % 5 === 0 && weatherCache['Paineiras']) {
          setDisplayCity('Paineiras');
        } else if (otherCities.length > 0) {
          currentIndex = (currentIndex + 1) % otherCities.length;
          setDisplayCity(otherCities[currentIndex]);
        } else if (availableCities.length > 0) {
          currentIndex = (currentIndex + 1) % availableCities.length;
          setDisplayCity(availableCities[currentIndex]);
        }
        return next;
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [availableCities.length, otherCities.length, weatherCache]);

  // Alternate between min and max temp every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setShowMaxTemp(prev => !prev);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Clock section component - responsive for mobile/tablet/TV
  const ClockSection = () => {
    if (!currentTime || !formatTime) return null;
    
    return (
      <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2 xl:gap-3 shrink-0">
        {/* Main Time Display */}
        <div className="flex items-baseline whitespace-nowrap shrink-0">
          <span className="font-mono font-black text-white tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl">
            {formatTime(currentTime, 'HH:mm')}
          </span>
          <span className="font-mono font-bold text-amber-300 animate-pulse text-xs sm:text-sm md:text-lg lg:text-xl xl:text-2xl 2xl:text-3xl">
            :{formatTime(currentTime, 'ss')}
          </span>
        </div>
        {/* Date Display */}
        <div className="text-center bg-white/10 rounded-md lg:rounded-lg px-1 sm:px-1.5 lg:px-2 xl:px-3 py-0.5 lg:py-1 shrink-0">
          <p className="font-bold text-amber-300 leading-tight whitespace-nowrap uppercase text-[8px] sm:text-[9px] md:text-[10px] lg:text-xs xl:text-sm">
            {formatTime(currentTime, "EEEE")}
          </p>
          <p className="font-semibold text-cyan-300 leading-tight whitespace-nowrap text-[8px] sm:text-[9px] md:text-[10px] lg:text-xs xl:text-sm">
            {formatTime(currentTime, "dd/MM/yyyy")}
          </p>
        </div>
      </div>
    );
  };

  // Only show loading on initial load
  if (initialLoading && !currentWeather) {
    return (
      <div className="flex items-center gap-2 sm:gap-3">
        <Cloud className="w-5 h-5 sm:w-6 sm:h-6 text-white/70 animate-pulse" />
        <span className="text-white/80 text-xs sm:text-sm">Carregando...</span>
        <ClockSection />
      </div>
    );
  }

  // If no cached data for current city, show last available or fallback
  const weather = currentWeather || weatherCache['Paineiras'] || Object.values(weatherCache)[0];

  if (!weather) {
    return (
      <div className="flex items-center gap-2 sm:gap-3">
        <Cloud className="w-5 h-5 sm:w-6 sm:h-6 text-white/50" />
        <span className="text-white/60 text-xs sm:text-sm">Indisponível</span>
        <ClockSection />
      </div>
    );
  }

  // Get max/min from forecast if available
  const todayForecast = weather.forecast?.[0];
  const maxTemp = todayForecast?.maxTemp ?? weather.current.temperature + 5;
  const minTemp = todayForecast?.minTemp ?? weather.current.temperature - 5;

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2 xl:gap-3 flex-nowrap justify-end shrink-0">
      {/* Clock Section - Always visible, on the right */}
      <ClockSection />
      
      {/* Separator - Hidden on small screens */}
      <div className="hidden md:block w-px h-5 lg:h-6 xl:h-8 bg-gradient-to-b from-transparent via-white/30 to-transparent shrink-0" />
      
      {/* City & Weather Icon - Hidden on very small screens */}
      <div className="hidden sm:flex items-center gap-1 lg:gap-2 shrink-0">
        <div className="flex flex-col items-center justify-center">
          <span className="font-bold text-white/70 uppercase tracking-wider text-[8px] sm:text-[9px] lg:text-[10px] xl:text-xs">Previsão</span>
          <div className="flex items-center gap-0.5 text-amber-300">
            <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-3.5 lg:h-3.5 animate-bounce shrink-0" />
            <span className="font-bold truncate max-w-[60px] sm:max-w-[80px] lg:max-w-[100px] text-[9px] sm:text-[10px] lg:text-xs xl:text-sm" title={`${displayCity}-MG`}>{displayCity}-MG</span>
          </div>
        </div>
        
        {/* Weather Icon with glow */}
        <div className="relative shrink-0">
          <div className="absolute inset-0 bg-yellow-400/30 blur-xl rounded-full" />
          <div className="relative bg-white/10 rounded-lg lg:rounded-xl p-1 lg:p-1.5 backdrop-blur-sm border border-white/10">
            {getWeatherIcon(weather.current.description, 'lg')}
          </div>
        </div>
      </div>
      
      {/* Current Temperature - Visible on sm+ */}
      <div className="hidden sm:flex flex-col items-center bg-gradient-to-br from-emerald-500/30 to-teal-600/30 rounded-lg lg:rounded-xl px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 backdrop-blur-sm border border-white/10 shrink-0">
        <span className="font-bold text-emerald-300 uppercase tracking-wider text-[8px] sm:text-[9px] lg:text-[10px] xl:text-xs">Agora</span>
        <div className="flex items-baseline">
          <span className="font-black text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.3)] tabular-nums text-lg sm:text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl">
            {weather.current.temperature}
          </span>
          <span className="font-bold text-emerald-300 text-xs sm:text-sm lg:text-base xl:text-lg">°C</span>
        </div>
        {weather.current.feelsLike !== undefined && weather.current.feelsLike !== weather.current.temperature && (
          <span className="text-white/70 whitespace-nowrap text-[7px] sm:text-[8px] lg:text-[9px] xl:text-[10px]">
            Sensação: <span className="font-bold text-amber-300 tabular-nums">{weather.current.feelsLike}°</span>
          </span>
        )}
      </div>
      
      {/* Max/Min Temperature Display - Hidden on small screens */}
      <div className="hidden md:flex flex-col items-center shrink-0">
        <span className={`font-bold uppercase tracking-wider text-[8px] sm:text-[9px] lg:text-[10px] xl:text-xs ${showMaxTemp ? 'text-orange-400' : 'text-cyan-400'}`}>
          {showMaxTemp ? 'Máxima' : 'Mínima'}
        </span>
        <div className="flex items-baseline">
          <span className="font-black text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.3)] tabular-nums text-lg sm:text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl">
            {showMaxTemp ? maxTemp : minTemp}
          </span>
          <span className="font-bold text-amber-300 text-xs sm:text-sm lg:text-base xl:text-lg">°C</span>
        </div>
      </div>
      
      {/* Humidity - Hidden on small/medium screens */}
      <div className="hidden lg:flex flex-col items-center bg-white/10 rounded-lg px-1.5 lg:px-2 xl:px-3 py-0.5 lg:py-1 backdrop-blur-sm shrink-0">
        <Droplets className="w-3 h-3 lg:w-4 lg:h-4 xl:w-5 xl:h-5 text-cyan-400 shrink-0" />
        <span className="font-bold text-white tabular-nums text-sm lg:text-base xl:text-lg 2xl:text-xl">{weather.current.humidity}%</span>
        <span className="text-white/60 text-[7px] lg:text-[8px] xl:text-[9px]">Umidade</span>
      </div>
      
      {/* Separator - Hidden on small/medium screens */}
      <div className="hidden lg:block w-px h-6 lg:h-8 xl:h-10 bg-gradient-to-b from-transparent via-white/30 to-transparent shrink-0" />
      
      {/* Forecast Cards - Hidden on small/medium screens */}
      <div className="hidden lg:flex gap-1.5 lg:gap-2 xl:gap-3 shrink-0">
        {weather.forecast?.slice(0, 2).map((day, index) => {
          const dayNames = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
          const today = currentTime || new Date();
          const targetDate = new Date(today);
          targetDate.setDate(targetDate.getDate() + index);
          const dayName = index === 0 ? 'HOJE' : dayNames[targetDate.getDay()];
          
          return (
            <div 
              key={index} 
              className={`${index === 0 ? 'bg-gradient-to-br from-amber-500/30 to-orange-600/30' : 'bg-white/10'} rounded-lg lg:rounded-xl px-2 lg:px-3 xl:px-4 py-1 lg:py-1.5 flex flex-col items-center backdrop-blur-sm border border-white/20`}
            >
              <span className="font-bold text-white text-[9px] lg:text-[10px] xl:text-xs 2xl:text-sm">{dayName}</span>
              <div className="my-0.5 lg:my-1">
                {getWeatherIcon(day.icon || 'cloud', 'lg')}
              </div>
              <div className="flex items-center gap-0.5 lg:gap-1">
                <span className="text-cyan-300 font-bold tabular-nums text-[9px] lg:text-[10px] xl:text-xs 2xl:text-sm">{day.minTemp}°</span>
                <span className="text-white/50 font-bold text-[8px] lg:text-[9px]">/</span>
                <span className="text-orange-300 font-bold tabular-nums text-[9px] lg:text-[10px] xl:text-xs 2xl:text-sm">{day.maxTemp}°</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
