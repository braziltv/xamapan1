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
    ? 'w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14 3xl:w-16 3xl:h-16 4k:w-20 4k:h-20' 
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

  // Modern digital clock design
  const renderDateTimeCompact = () => {
    const hours = safeFormatTime(currentTime, 'HH');
    const minutes = safeFormatTime(currentTime, 'mm');
    const seconds = safeFormatTime(currentTime, 'ss');
    
    return (
      <div className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Date pill */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="bg-gradient-to-r from-amber-500/20 via-amber-400/30 to-amber-500/20 rounded-full px-2 sm:px-3 lg:px-4 py-0.5 border border-amber-400/40 backdrop-blur-sm">
            <p className="font-bold text-amber-300 leading-tight whitespace-nowrap uppercase tracking-wider text-[9px] sm:text-[10px] lg:text-xs xl:text-sm 3xl:text-base 4k:text-lg drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]">
              {safeFormatTime(currentTime, 'EEEE')}
            </p>
          </div>
          <div className="bg-white/10 rounded-full px-2 sm:px-3 lg:px-4 py-0.5 border border-cyan-400/30 backdrop-blur-sm">
            <p className="font-semibold text-cyan-300 leading-tight whitespace-nowrap text-[9px] sm:text-[10px] lg:text-xs xl:text-sm 3xl:text-base 4k:text-lg drop-shadow-[0_0_6px_rgba(6,182,212,0.4)]">
              {safeFormatTime(currentTime, 'dd/MM/yyyy')}
            </p>
          </div>
        </div>
        
        {/* Digital Clock Display */}
        <div className="relative group">
          {/* Glow background */}
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/30 via-blue-500/30 to-cyan-500/30 rounded-xl blur-md opacity-70 group-hover:opacity-100 transition-opacity" />
          
          {/* Main clock container */}
          <div className="relative flex items-center gap-0.5 sm:gap-1 bg-gradient-to-b from-slate-900/95 to-black/95 rounded-lg sm:rounded-xl px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5 lg:py-2 border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]">
            
            {/* Hours */}
            <div className="flex">
              <span className="font-mono font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-200 via-cyan-300 to-cyan-400 tracking-tight text-2xl sm:text-3xl lg:text-4xl xl:text-5xl 3xl:text-6xl 4k:text-7xl drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]" style={{ fontFamily: "'Orbitron', 'SF Mono', monospace", letterSpacing: '-0.02em' }}>
                {hours}
              </span>
            </div>
            
            {/* Animated colon separator */}
            <div className="flex flex-col items-center justify-center gap-0.5 sm:gap-1 mx-0.5 sm:mx-1">
              <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 lg:w-2 lg:h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.9)]" />
              <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 lg:w-2 lg:h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.9)]" style={{ animationDelay: '0.5s' }} />
            </div>
            
            {/* Minutes */}
            <div className="flex">
              <span className="font-mono font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-200 via-cyan-300 to-cyan-400 tracking-tight text-2xl sm:text-3xl lg:text-4xl xl:text-5xl 3xl:text-6xl 4k:text-7xl drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]" style={{ fontFamily: "'Orbitron', 'SF Mono', monospace", letterSpacing: '-0.02em' }}>
                {minutes}
              </span>
            </div>
            
            {/* Seconds with accent color */}
            <div className="flex items-end ml-0.5 sm:ml-1">
              <span className="font-mono font-bold text-transparent bg-clip-text bg-gradient-to-b from-amber-300 via-amber-400 to-orange-400 text-sm sm:text-base lg:text-xl xl:text-2xl 3xl:text-3xl 4k:text-4xl animate-pulse drop-shadow-[0_0_10px_rgba(251,191,36,0.7)]" style={{ fontFamily: "'Orbitron', 'SF Mono', monospace" }}>
                {seconds}
              </span>
            </div>
          </div>
          
          {/* Subtle reflection at bottom */}
          <div className="absolute -bottom-0.5 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
        </div>
      </div>
    );
  };

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
          <span className="font-black text-white uppercase tracking-wider text-[9px] sm:text-xs lg:text-sm xl:text-base 3xl:text-lg 4k:text-xl">
            Previsão
          </span>
          <div className="flex items-center gap-0.5 text-amber-300">
            <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 3xl:w-6 3xl:h-6 animate-bounce shrink-0" />
            <span className="font-black whitespace-nowrap text-xs sm:text-sm lg:text-base xl:text-lg 3xl:text-xl 4k:text-2xl">
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
