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

// 3D-style weather icon component
function Weather3DIcon({ description, size = 'sm' }: { description: string; size?: 'sm' | 'lg' }) {
  const desc = description.toLowerCase();
  
  const sizeClasses = size === 'lg' 
    ? 'w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 xl:w-12 xl:h-12 3xl:w-14 3xl:h-14 4k:w-16 4k:h-16' 
    : 'w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 3xl:w-7 3xl:h-7';
  
  const iconContainerClass = size === 'lg'
    ? 'relative group'
    : 'relative';

  // Determine icon type and colors
  let IconComponent = CloudSun;
  let primaryColor = 'from-yellow-300 via-yellow-400 to-orange-400';
  let glowColor = 'rgba(251, 191, 36, 0.6)';
  let animation = 'animate-pulse';
  
  if (desc.includes('sunny') || desc.includes('clear') || desc.includes('sol') || desc.includes('limpo')) {
    IconComponent = Sun;
    primaryColor = 'from-yellow-300 via-amber-400 to-orange-500';
    glowColor = 'rgba(251, 191, 36, 0.8)';
    animation = 'animate-[spin_12s_linear_infinite]';
  } else if (desc.includes('partly') || desc.includes('parcialmente')) {
    IconComponent = CloudSun;
    primaryColor = 'from-yellow-200 via-amber-300 to-orange-400';
    glowColor = 'rgba(251, 191, 36, 0.5)';
    animation = 'animate-pulse';
  } else if (desc.includes('rain') || desc.includes('shower') || desc.includes('chuva') || desc.includes('pancada')) {
    IconComponent = CloudRain;
    primaryColor = 'from-blue-300 via-blue-400 to-blue-600';
    glowColor = 'rgba(59, 130, 246, 0.6)';
    animation = 'animate-bounce';
  } else if (desc.includes('thunder') || desc.includes('storm') || desc.includes('trovoada') || desc.includes('tempestade')) {
    IconComponent = CloudLightning;
    primaryColor = 'from-purple-300 via-purple-500 to-purple-700';
    glowColor = 'rgba(168, 85, 247, 0.7)';
    animation = 'animate-[pulse_0.5s_ease-in-out_infinite]';
  } else if (desc.includes('snow') || desc.includes('neve')) {
    IconComponent = CloudSnow;
    primaryColor = 'from-slate-100 via-blue-100 to-cyan-200';
    glowColor = 'rgba(255, 255, 255, 0.6)';
    animation = 'animate-[bounce_2s_ease-in-out_infinite]';
  } else if (desc.includes('fog') || desc.includes('mist') || desc.includes('neblina') || desc.includes('nevoeiro')) {
    IconComponent = Wind;
    primaryColor = 'from-slate-300 via-slate-400 to-slate-500';
    glowColor = 'rgba(148, 163, 184, 0.5)';
    animation = 'animate-pulse';
  } else if (desc.includes('cloud') || desc.includes('nublado') || desc.includes('encoberto')) {
    IconComponent = Cloud;
    primaryColor = 'from-slate-200 via-slate-300 to-slate-400';
    glowColor = 'rgba(148, 163, 184, 0.5)';
    animation = 'animate-pulse';
  }

  if (size === 'lg') {
    return (
      <div className={iconContainerClass}>
        {/* Outer glow ring */}
        <div 
          className="absolute -inset-2 rounded-full blur-xl opacity-60 animate-pulse"
          style={{ background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)` }}
        />
        
        {/* 3D glass container */}
        <div className="relative">
          {/* Background gradient with depth */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 via-transparent to-black/20 backdrop-blur-md" />
          
          {/* Main 3D icon container */}
          <div 
            className={`relative ${sizeClasses} rounded-xl bg-gradient-to-br from-slate-800/80 via-slate-900/90 to-black/80 border border-white/20 flex items-center justify-center overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-2px_4px_rgba(0,0,0,0.3)]`}
            style={{ transform: 'perspective(200px) rotateX(5deg)' }}
          >
            {/* Inner highlight */}
            <div className="absolute top-0 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            
            {/* Icon with gradient fill effect */}
            <div className={`relative ${animation}`}>
              <IconComponent 
                className={`w-5 h-5 sm:w-6 sm:h-6 lg:w-6 lg:h-6 xl:w-7 xl:h-7 3xl:w-10 3xl:h-10 4k:w-12 4k:h-12`}
                style={{ 
                  filter: `drop-shadow(0 0 8px ${glowColor}) drop-shadow(0 4px 6px rgba(0,0,0,0.4))`,
                  color: 'white'
                }}
              />
              {/* Gradient overlay for 3D effect */}
              <div className={`absolute inset-0 bg-gradient-to-b ${primaryColor} opacity-80 mix-blend-overlay rounded-full`} />
            </div>
            
            {/* Bottom reflection */}
            <div className="absolute bottom-0 left-[20%] right-[20%] h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>
        </div>
      </div>
    );
  }

  // Small icon version
  return (
    <div className={iconContainerClass}>
      <div 
        className={`${sizeClasses} rounded-md bg-gradient-to-br from-slate-700/60 to-slate-900/60 border border-white/10 flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] ${animation}`}
      >
        <IconComponent 
          className="w-3 h-3 sm:w-4 sm:h-4 lg:w-4 lg:h-4 3xl:w-5 3xl:h-5"
          style={{ 
            filter: `drop-shadow(0 0 4px ${glowColor})`,
            color: 'white'
          }}
        />
      </div>
    </div>
  );
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
      <div className="flex flex-col items-center gap-0.5 sm:gap-1 shrink-0">
        {/* Date pill - more compact */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <div className="bg-gradient-to-r from-amber-500/20 via-amber-400/30 to-amber-500/20 rounded-full px-1.5 sm:px-2 lg:px-2.5 py-0.5 border border-amber-400/40 backdrop-blur-sm">
            <p className="font-bold text-amber-300 leading-tight whitespace-nowrap uppercase tracking-wider text-[7px] sm:text-[8px] lg:text-[9px] xl:text-[10px] 3xl:text-xs 4k:text-sm drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]">
              {safeFormatTime(currentTime, 'EEEE')}
            </p>
          </div>
          <div className="bg-white/10 rounded-full px-1.5 sm:px-2 lg:px-2.5 py-0.5 border border-cyan-400/30 backdrop-blur-sm">
            <p className="font-semibold text-cyan-300 leading-tight whitespace-nowrap text-[7px] sm:text-[8px] lg:text-[9px] xl:text-[10px] 3xl:text-xs 4k:text-sm drop-shadow-[0_0_4px_rgba(6,182,212,0.4)]">
              {safeFormatTime(currentTime, 'dd/MM/yyyy')}
            </p>
          </div>
        </div>
        
        {/* Digital Clock Display - more compact */}
        <div className="relative group">
          {/* Glow background */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-cyan-500/20 rounded-lg blur-sm opacity-70" />
          
          {/* Main clock container */}
          <div className="relative flex items-center gap-0.5 bg-gradient-to-b from-slate-900/95 to-black/95 rounded-md sm:rounded-lg px-1.5 sm:px-2 lg:px-2.5 py-0.5 sm:py-1 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]">
            
            {/* Hours */}
            <span className="font-mono font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-200 via-cyan-300 to-cyan-400 tracking-tight text-lg sm:text-xl lg:text-2xl xl:text-3xl 3xl:text-4xl 4k:text-5xl drop-shadow-[0_0_10px_rgba(6,182,212,0.7)]" style={{ fontFamily: "'Orbitron', 'SF Mono', monospace", letterSpacing: '-0.02em' }}>
              {hours}
            </span>
            
            {/* Animated colon separator */}
            <div className="flex flex-col items-center justify-center gap-0.5 mx-0.5">
              <div className="w-0.5 h-0.5 sm:w-1 sm:h-1 lg:w-1.5 lg:h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
              <div className="w-0.5 h-0.5 sm:w-1 sm:h-1 lg:w-1.5 lg:h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_rgba(6,182,212,0.8)]" style={{ animationDelay: '0.5s' }} />
            </div>
            
            {/* Minutes */}
            <span className="font-mono font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-200 via-cyan-300 to-cyan-400 tracking-tight text-lg sm:text-xl lg:text-2xl xl:text-3xl 3xl:text-4xl 4k:text-5xl drop-shadow-[0_0_10px_rgba(6,182,212,0.7)]" style={{ fontFamily: "'Orbitron', 'SF Mono', monospace", letterSpacing: '-0.02em' }}>
              {minutes}
            </span>
            
            {/* Seconds with accent color */}
            <span className="font-mono font-bold text-transparent bg-clip-text bg-gradient-to-b from-amber-300 via-amber-400 to-orange-400 text-[10px] sm:text-xs lg:text-sm xl:text-base 3xl:text-lg 4k:text-xl animate-pulse drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] ml-0.5" style={{ fontFamily: "'Orbitron', 'SF Mono', monospace" }}>
              {seconds}
            </span>
          </div>
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
    <div className="w-full flex items-center gap-1.5 sm:gap-2 lg:gap-2.5 xl:gap-3 3xl:gap-4 justify-end flex-nowrap overflow-hidden">
      {/* City + Weather Icon - Compact 3D Glass Card */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <div className="relative">
          {/* Glow effect behind city info */}
          <div className="absolute -inset-1 bg-gradient-to-br from-amber-500/15 to-orange-500/10 rounded-xl blur-sm" />
          
          <div className="relative flex flex-col items-center bg-gradient-to-br from-slate-800/80 via-slate-900/90 to-black/80 rounded-xl px-2 sm:px-2.5 py-1 sm:py-1.5 border border-amber-500/30 shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]">
            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-white uppercase tracking-wider text-[8px] sm:text-[10px] lg:text-[11px] xl:text-xs 3xl:text-sm 4k:text-base drop-shadow-md">
              Previsão
            </span>
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 3xl:w-5 3xl:h-5 text-amber-400 animate-bounce shrink-0 drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]" />
              <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400 whitespace-nowrap text-[11px] sm:text-xs lg:text-sm xl:text-base 3xl:text-lg 4k:text-xl drop-shadow-md">
                {displayCity}-MG
              </span>
            </div>
          </div>
        </div>
        
        {/* 3D Weather Icon */}
        <Weather3DIcon description={weather.current.description} size="lg" />
      </div>

      {/* Current Temperature - Compact 3D Glass Card */}
      <div className="relative shrink-0">
        <div className="absolute -inset-1 bg-gradient-to-br from-emerald-500/20 to-teal-500/15 rounded-xl blur-sm opacity-70" />
        
        <div className="relative flex flex-col items-center bg-gradient-to-br from-slate-800/80 via-slate-900/90 to-black/80 rounded-xl px-2 sm:px-2.5 py-1 sm:py-1.5 border border-emerald-500/40 shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]">
          <span className="font-bold text-emerald-400 uppercase tracking-wider text-[6px] sm:text-[7px] lg:text-[8px] xl:text-[10px] 3xl:text-[11px] 4k:text-sm drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]">
            Agora
          </span>
          <div className="flex items-baseline">
            <span className="font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-emerald-50 to-emerald-100 tabular-nums text-base sm:text-lg lg:text-xl xl:text-2xl 3xl:text-3xl 4k:text-4xl drop-shadow-md" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              {weather.current.temperature}
            </span>
            <span className="font-bold text-emerald-400 text-[8px] sm:text-[10px] lg:text-[11px] xl:text-xs 3xl:text-sm 4k:text-base drop-shadow-[0_0_4px_rgba(52,211,153,0.4)]">°C</span>
          </div>
        </div>
      </div>

      {/* Max/Min Temperature - Compact 3D Glass Card */}
      <div className="relative shrink-0">
        <div className={`absolute -inset-1 rounded-xl blur-sm opacity-50 transition-all duration-500 ${
          showMaxTemp ? 'bg-gradient-to-br from-orange-500/25 to-red-500/15' : 'bg-gradient-to-br from-cyan-500/25 to-blue-500/15'
        }`} />
        
        <div className={`relative flex flex-col items-center bg-gradient-to-br from-slate-800/80 via-slate-900/90 to-black/80 rounded-xl px-2 sm:px-2.5 py-1 sm:py-1.5 border shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all duration-500 ${
          showMaxTemp ? 'border-orange-500/40' : 'border-cyan-500/40'
        }`}>
          <span className={`font-bold uppercase tracking-wider text-[6px] sm:text-[7px] lg:text-[8px] xl:text-[10px] 3xl:text-[11px] 4k:text-sm transition-colors duration-500 ${
            showMaxTemp ? 'text-orange-400 drop-shadow-[0_0_6px_rgba(251,146,60,0.4)]' : 'text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.4)]'
          }`}>
            {showMaxTemp ? 'Máx' : 'Mín'}
          </span>
          <div className="flex items-baseline">
            <span className={`font-black text-transparent bg-clip-text tabular-nums text-base sm:text-lg lg:text-xl xl:text-2xl 3xl:text-3xl 4k:text-4xl drop-shadow-md transition-all duration-500 ${
              showMaxTemp ? 'bg-gradient-to-b from-white via-orange-50 to-orange-100' : 'bg-gradient-to-b from-white via-cyan-50 to-cyan-100'
            }`} style={{ fontFamily: "'Orbitron', sans-serif" }}>
              {showMaxTemp ? maxTemp : minTemp}
            </span>
            <span className={`font-bold text-[8px] sm:text-[10px] lg:text-[11px] xl:text-xs 3xl:text-sm 4k:text-base transition-colors duration-500 ${
              showMaxTemp ? 'text-orange-400 drop-shadow-[0_0_4px_rgba(251,146,60,0.4)]' : 'text-cyan-400 drop-shadow-[0_0_4px_rgba(34,211,238,0.4)]'
            }`}>°C</span>
          </div>
        </div>
      </div>

      {/* Humidity - Compact 3D Glass Card */}
      <div className="relative shrink-0">
        <div className="absolute -inset-1 bg-gradient-to-br from-blue-500/20 to-cyan-500/10 rounded-xl blur-sm opacity-60" />
        
        <div className="relative flex flex-col items-center bg-gradient-to-br from-slate-800/80 via-slate-900/90 to-black/80 rounded-xl px-2 sm:px-2.5 py-1 sm:py-1.5 border border-blue-500/40 shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]">
          <Droplets className="w-3.5 h-3.5 lg:w-4 lg:h-4 xl:w-5 xl:h-5 3xl:w-6 3xl:h-6 text-cyan-400 shrink-0 drop-shadow-[0_0_6px_rgba(34,211,238,0.5)] animate-pulse" />
          <span className="font-bold text-transparent bg-clip-text bg-gradient-to-b from-white via-blue-50 to-cyan-100 tabular-nums text-[10px] sm:text-[11px] lg:text-xs xl:text-sm 3xl:text-base 4k:text-lg drop-shadow-md" style={{ fontFamily: "'Orbitron', sans-serif" }}>
            {weather.current.humidity}%
          </span>
        </div>
      </div>

      {/* Forecast Cards - Compact 3D Glass Style with smooth animations - visible on lg+ */}
      <div className="hidden lg:flex gap-1.5 shrink-0">
        {weather.forecast?.slice(0, 2).map((day, index) => {
          const dayNames = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
          const today = currentTime;
          const targetDate = new Date(today);
          targetDate.setDate(targetDate.getDate() + index);
          const dayName = index === 0 ? 'HOJE' : dayNames[targetDate.getDay()];

          return (
            <div 
              key={`forecast-${index}-${day.date}`} 
              className="relative group animate-[forecastCardIn_0.5s_ease-out_forwards] opacity-0"
              style={{ 
                animationDelay: `${index * 150}ms`,
                animationFillMode: 'forwards'
              }}
            >
              {/* Animated glow effect */}
              <div className={`absolute -inset-1 rounded-xl blur-sm transition-all duration-500 group-hover:blur-md ${
                index === 0 
                  ? 'bg-gradient-to-br from-amber-500/30 to-orange-500/20 opacity-40 group-hover:opacity-70' 
                  : 'bg-gradient-to-br from-purple-500/25 to-indigo-500/15 opacity-40 group-hover:opacity-60'
              }`} />
              
              {/* Shimmer overlay on hover */}
              <div className="absolute inset-0 rounded-xl overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              </div>
              
              <div className={`relative flex flex-col items-center bg-gradient-to-br from-slate-800/80 via-slate-900/90 to-black/80 rounded-xl px-1.5 lg:px-2 py-1 lg:py-1.5 border shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_4px_16px_rgba(0,0,0,0.4)] ${
                index === 0 ? 'border-amber-500/40 group-hover:border-amber-400/60' : 'border-purple-500/30 group-hover:border-purple-400/50'
              }`}>
                {/* Animated top highlight */}
                <div className={`absolute top-0 left-[10%] right-[10%] h-px transition-all duration-300 ${
                  index === 0 
                    ? 'bg-gradient-to-r from-transparent via-amber-400/30 to-transparent group-hover:via-amber-400/60' 
                    : 'bg-gradient-to-r from-transparent via-purple-400/20 to-transparent group-hover:via-purple-400/50'
                }`} />
                
                <span className={`font-bold text-[7px] lg:text-[8px] xl:text-[10px] 3xl:text-[11px] 4k:text-sm tracking-wide transition-all duration-300 ${
                  index === 0 
                    ? 'text-amber-300 drop-shadow-[0_0_4px_rgba(251,191,36,0.4)] group-hover:text-amber-200 group-hover:drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]' 
                    : 'text-purple-300 drop-shadow-[0_0_3px_rgba(168,85,247,0.3)] group-hover:text-purple-200 group-hover:drop-shadow-[0_0_6px_rgba(168,85,247,0.5)]'
                }`}>
                  {dayName}
                </span>
                
                <div className="my-1 transition-transform duration-300 group-hover:scale-110">
                  <Weather3DIcon description={day.icon || 'cloud'} size="sm" />
                </div>
                
                <div className="flex items-center gap-1">
                  <span className="text-cyan-300 font-bold tabular-nums text-[7px] lg:text-[8px] xl:text-[10px] 3xl:text-[11px] 4k:text-sm drop-shadow-sm transition-all duration-300 group-hover:text-cyan-200 group-hover:drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]">
                    {day.minTemp}°
                  </span>
                  <span className="text-white/40 font-bold text-[6px] lg:text-[7px] transition-colors duration-300 group-hover:text-white/60">/</span>
                  <span className="text-orange-300 font-bold tabular-nums text-[7px] lg:text-[8px] xl:text-[10px] 3xl:text-[11px] 4k:text-sm drop-shadow-sm transition-all duration-300 group-hover:text-orange-200 group-hover:drop-shadow-[0_0_6px_rgba(251,146,60,0.5)]">
                    {day.maxTemp}°
                  </span>
                </div>
                
                {/* Bottom animated bar */}
                <div className={`absolute bottom-0 left-[20%] right-[20%] h-px transition-all duration-500 ${
                  index === 0 
                    ? 'bg-gradient-to-r from-transparent via-amber-500/0 to-transparent group-hover:via-amber-500/40' 
                    : 'bg-gradient-to-r from-transparent via-purple-500/0 to-transparent group-hover:via-purple-500/30'
                }`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Date + Clock */}
      {renderDateTimeCompact()}
    </div>
  );
}
