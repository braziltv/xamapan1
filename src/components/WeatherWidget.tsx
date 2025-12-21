import { useEffect, useState, useRef, useCallback } from 'react';
import { Cloud, Droplets, Sun, CloudRain, CloudSnow, CloudLightning, Wind, CloudSun, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useBrazilTime, formatBrazilTime } from '@/hooks/useBrazilTime';

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
  const iconClass = size === 'lg' 
    ? 'w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 xl:w-8 xl:h-8 3xl:w-10 3xl:h-10 4k:w-12 4k:h-12' 
    : 'w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 3xl:w-6 3xl:h-6';
  
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

export function WeatherWidget({ currentTime: propTime, formatTime: propFormatTime }: WeatherWidgetProps) {
  const { currentTime: hookTime } = useBrazilTime();
  const currentTime = propTime || hookTime;
  const formatTime = propFormatTime || formatBrazilTime;

  const [weatherCache, setWeatherCache] = useState<Record<string, WeatherData>>({});
  const [displayCity, setDisplayCity] = useState('Paineiras');
  const [showMaxTemp, setShowMaxTemp] = useState(true);
  const [rotationCount, setRotationCount] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const fetchingRef = useRef(false);

  const availableCities = Object.keys(weatherCache);
  const otherCities = availableCities.filter(c => c !== 'Paineiras');
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
    if (availableCities.length === 0) return;
    
    let currentIndex = 0;
    
    const interval = setInterval(() => {
      setRotationCount(prev => {
        const next = prev + 1;
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

  useEffect(() => {
    const interval = setInterval(() => {
      setShowMaxTemp(prev => !prev);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const safeFormatTime = (date: Date, format: string): string => {
    try {
      if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        if (format === 'HH:mm') return '--:--';
        if (format === 'ss') return '--';
        if (format === 'EEEE') return '---';
        if (format === 'dd/MM/yyyy') return '--/--/----';
        return '--';
      }
      return formatTime(date, format);
    } catch (error) {
      console.error('Error formatting time:', error);
      return '--';
    }
  };

  // Compact date+clock for landscape mode
  const renderDateTimeCompact = () => (
    <div className="flex flex-col items-center gap-0.5 sm:gap-1 shrink-0">
      <div className="text-center bg-white/10 rounded px-1.5 sm:px-2 lg:px-3 py-0.5">
        <p className="font-bold text-amber-300 leading-tight whitespace-nowrap uppercase text-[8px] sm:text-[9px] lg:text-xs xl:text-sm 3xl:text-base 4k:text-lg">
          {safeFormatTime(currentTime, 'EEEE')}
        </p>
        <p className="font-semibold text-cyan-300 leading-tight whitespace-nowrap text-[8px] sm:text-[9px] lg:text-xs xl:text-sm 3xl:text-base 4k:text-lg">
          {safeFormatTime(currentTime, 'dd/MM/yyyy')}
        </p>
      </div>
      <div className="flex items-baseline justify-center whitespace-nowrap bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
        <span className="font-mono font-black text-cyan-300 tracking-tight drop-shadow-[0_2px_6px_rgba(6,182,212,0.7)] text-lg sm:text-xl lg:text-2xl xl:text-3xl 3xl:text-4xl 4k:text-5xl">
          {safeFormatTime(currentTime, 'HH:mm')}
        </span>
        <span className="font-mono font-bold text-amber-300 animate-pulse text-xs sm:text-sm lg:text-lg xl:text-xl 3xl:text-2xl 4k:text-3xl">
          :{safeFormatTime(currentTime, 'ss')}
        </span>
      </div>
    </div>
  );

  // Loading state
  if (initialLoading && !currentWeather) {
    return (
      <div className="flex items-center gap-2 sm:gap-3">
        {renderDateTimeCompact()}
        <Cloud className="w-5 h-5 sm:w-6 sm:h-6 text-white/70 animate-pulse" />
        <span className="text-white/80 text-xs sm:text-sm">Carregando...</span>
      </div>
    );
  }

  const weather = currentWeather || weatherCache['Paineiras'] || Object.values(weatherCache)[0];

  if (!weather) {
    return (
      <div className="flex items-center gap-2 sm:gap-3">
        {renderDateTimeCompact()}
        <Cloud className="w-5 h-5 sm:w-6 sm:h-6 text-white/50" />
        <span className="text-white/60 text-xs sm:text-sm">Indisponível</span>
      </div>
    );
  }

  const todayForecast = weather.forecast?.[0];
  const maxTemp = todayForecast?.maxTemp ?? weather.current.temperature + 5;
  const minTemp = todayForecast?.minTemp ?? weather.current.temperature - 5;

  return (
    <div className="w-full flex items-center gap-1.5 sm:gap-2 lg:gap-3 xl:gap-4 3xl:gap-5 justify-end flex-nowrap overflow-visible">
      {/* City + Weather Icon */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        <div className="flex flex-col items-center">
          <span className="font-bold text-white/70 uppercase tracking-wider text-[6px] sm:text-[7px] lg:text-[8px] xl:text-[9px] 3xl:text-xs 4k:text-sm">
            Previsão
          </span>
          <div className="flex items-center gap-0.5 text-amber-300">
            <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-3.5 lg:h-3.5 3xl:w-4 3xl:h-4 animate-bounce shrink-0" />
            <span className="font-bold whitespace-nowrap text-[7px] sm:text-[8px] lg:text-[9px] xl:text-xs 3xl:text-sm 4k:text-base">
              {displayCity}-MG
            </span>
          </div>
        </div>
        <div className="relative shrink-0">
          <div className="absolute inset-0 bg-yellow-400/20 blur-lg rounded-full" />
          <div className="relative bg-white/10 rounded-lg p-1 lg:p-1.5 backdrop-blur-sm border border-white/10">
            {getWeatherIcon(weather.current.description, 'lg')}
          </div>
        </div>
      </div>

      {/* Current Temperature */}
      <div className="flex flex-col items-center bg-gradient-to-br from-emerald-500/30 to-teal-600/30 rounded-lg px-1 sm:px-1.5 lg:px-2 py-0.5 backdrop-blur-sm border border-white/10 shrink-0">
        <span className="font-bold text-emerald-300 uppercase tracking-wider text-[6px] sm:text-[7px] lg:text-[8px] xl:text-[9px] 3xl:text-xs 4k:text-sm">
          Agora
        </span>
        <div className="flex items-baseline">
          <span className="font-black text-white tabular-nums text-sm sm:text-base lg:text-lg xl:text-xl 3xl:text-2xl 4k:text-3xl">
            {weather.current.temperature}
          </span>
          <span className="font-bold text-emerald-300 text-[8px] sm:text-[9px] lg:text-xs xl:text-sm 3xl:text-base 4k:text-lg">°C</span>
        </div>
        {weather.current.feelsLike !== undefined && weather.current.feelsLike !== weather.current.temperature && (
          <span className="text-white/70 whitespace-nowrap text-[5px] sm:text-[6px] lg:text-[7px] xl:text-[8px] 3xl:text-[9px] 4k:text-xs">
            Sens: <span className="font-bold text-amber-300 tabular-nums">{weather.current.feelsLike}°</span>
          </span>
        )}
      </div>

      {/* Max/Min Temperature */}
      <div className="flex flex-col items-center shrink-0">
        <span className={`font-bold uppercase tracking-wider text-[6px] sm:text-[7px] lg:text-[8px] xl:text-[9px] 3xl:text-xs 4k:text-sm ${showMaxTemp ? 'text-orange-400' : 'text-cyan-400'}`}>
          {showMaxTemp ? 'Máx' : 'Mín'}
        </span>
        <div className="flex items-baseline">
          <span className="font-black text-white tabular-nums text-sm sm:text-base lg:text-lg xl:text-xl 3xl:text-2xl 4k:text-3xl">
            {showMaxTemp ? maxTemp : minTemp}
          </span>
          <span className="font-bold text-amber-300 text-[8px] sm:text-[9px] lg:text-xs xl:text-sm 3xl:text-base 4k:text-lg">°C</span>
        </div>
      </div>

      {/* Humidity */}
      <div className="flex flex-col items-center bg-white/10 rounded-lg px-1 sm:px-1.5 lg:px-2 py-0.5 backdrop-blur-sm shrink-0">
        <Droplets className="w-3 h-3 lg:w-3.5 lg:h-3.5 xl:w-4 xl:h-4 3xl:w-5 3xl:h-5 text-cyan-400 shrink-0" />
        <span className="font-bold text-white tabular-nums text-[9px] sm:text-xs lg:text-sm xl:text-base 3xl:text-lg 4k:text-xl">
          {weather.current.humidity}%
        </span>
      </div>

      {/* Forecast Cards - visible on md+ */}
      <div className="hidden md:flex gap-1 lg:gap-1.5 shrink-0">
        {weather.forecast?.slice(0, 2).map((day, index) => {
          const dayNames = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
          const today = currentTime;
          const targetDate = new Date(today);
          targetDate.setDate(targetDate.getDate() + index);
          const dayName = index === 0 ? 'HOJE' : dayNames[targetDate.getDay()];

          return (
            <div
              key={index}
              className={`${index === 0 ? 'bg-gradient-to-br from-amber-500/30 to-orange-600/30' : 'bg-white/10'} rounded-lg px-1 lg:px-1.5 py-0.5 lg:py-1 flex flex-col items-center backdrop-blur-sm border border-white/20`}
            >
              <span className="font-bold text-white text-[7px] lg:text-[8px] xl:text-[9px] 3xl:text-xs 4k:text-sm">
                {dayName}
              </span>
              <div className="my-0.5">{getWeatherIcon(day.icon || 'cloud', 'sm')}</div>
              <div className="flex items-center gap-0.5">
                <span className="text-cyan-300 font-bold tabular-nums text-[7px] lg:text-[8px] xl:text-[9px] 3xl:text-xs 4k:text-sm">
                  {day.minTemp}°
                </span>
                <span className="text-white/50 font-bold text-[6px] lg:text-[7px]">/</span>
                <span className="text-orange-300 font-bold tabular-nums text-[7px] lg:text-[8px] xl:text-[9px] 3xl:text-xs 4k:text-sm">
                  {day.maxTemp}°
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Separator */}
      <div className="w-px h-6 sm:h-8 lg:h-10 bg-gradient-to-b from-transparent via-white/30 to-transparent shrink-0" />

      {/* Date + Clock */}
      {renderDateTimeCompact()}
    </div>
  );
}
