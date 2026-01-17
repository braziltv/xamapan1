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
    ? 'w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 xl:w-16 xl:h-16 3xl:w-20 3xl:h-20 4k:w-24 4k:h-24' 
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
                className={`w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 xl:w-10 xl:h-10 3xl:w-12 3xl:h-12 4k:w-14 4k:h-14`}
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
          className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-3.5 lg:h-3.5 3xl:w-4 3xl:h-4"
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
      {/* City + Weather Icon - 3D Glass Card */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <div className="relative">
          {/* Glow effect behind city info */}
          <div className="absolute -inset-1 bg-gradient-to-br from-amber-500/20 to-orange-500/10 rounded-xl blur-md" />
          
          <div className="relative flex flex-col items-center bg-gradient-to-br from-slate-800/80 via-slate-900/90 to-black/80 rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 border border-amber-500/30 shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]">
            <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-white uppercase tracking-wider text-[9px] sm:text-xs lg:text-sm xl:text-base 3xl:text-lg 4k:text-xl drop-shadow-lg">
              Previsão
            </span>
            <div className="flex items-center gap-0.5">
              <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 3xl:w-5 3xl:h-5 text-amber-400 animate-bounce shrink-0 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
              <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400 whitespace-nowrap text-xs sm:text-sm lg:text-base xl:text-lg 3xl:text-xl 4k:text-2xl drop-shadow-lg">
                {displayCity}-MG
              </span>
            </div>
          </div>
        </div>
        
        {/* 3D Weather Icon */}
        <Weather3DIcon description={weather.current.description} size="lg" />
      </div>

      {/* Current Temperature - 3D Glass Card */}
      <div className="relative shrink-0 group">
        {/* Glow */}
        <div className="absolute -inset-1 bg-gradient-to-br from-emerald-500/30 to-teal-500/20 rounded-xl blur-md opacity-70 group-hover:opacity-100 transition-opacity" />
        
        <div className="relative flex flex-col items-center bg-gradient-to-br from-slate-800/80 via-slate-900/90 to-black/80 rounded-xl px-2 sm:px-2.5 lg:px-3 py-1 sm:py-1.5 border border-emerald-500/40 shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1),0_0_20px_rgba(16,185,129,0.15)]">
          {/* Top highlight */}
          <div className="absolute top-0 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />
          
          <span className="font-bold text-emerald-400 uppercase tracking-wider text-[6px] sm:text-[7px] lg:text-[8px] xl:text-[9px] 3xl:text-xs 4k:text-sm drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">
            Agora
          </span>
          <div className="flex items-baseline">
            <span className="font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-emerald-50 to-emerald-100 tabular-nums text-base sm:text-lg lg:text-xl xl:text-2xl 3xl:text-3xl 4k:text-4xl drop-shadow-lg" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              {weather.current.temperature}
            </span>
            <span className="font-bold text-emerald-400 text-[9px] sm:text-[10px] lg:text-xs xl:text-sm 3xl:text-base 4k:text-lg drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]">°C</span>
          </div>
          {weather.current.feelsLike !== undefined && weather.current.feelsLike !== weather.current.temperature && (
            <span className="text-white/70 whitespace-nowrap text-[5px] sm:text-[6px] lg:text-[7px] xl:text-[8px] 3xl:text-[9px] 4k:text-xs">
              Sens: <span className="font-bold text-amber-300 tabular-nums drop-shadow-sm">{weather.current.feelsLike}°</span>
            </span>
          )}
        </div>
      </div>

      {/* Max/Min Temperature - 3D Glass Card */}
      <div className="relative shrink-0 group">
        {/* Glow - changes color based on max/min */}
        <div className={`absolute -inset-1 rounded-xl blur-md opacity-60 transition-all duration-500 ${
          showMaxTemp ? 'bg-gradient-to-br from-orange-500/30 to-red-500/20' : 'bg-gradient-to-br from-cyan-500/30 to-blue-500/20'
        }`} />
        
        <div className={`relative flex flex-col items-center bg-gradient-to-br from-slate-800/80 via-slate-900/90 to-black/80 rounded-xl px-2 sm:px-2.5 lg:px-3 py-1 sm:py-1.5 border shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all duration-500 ${
          showMaxTemp ? 'border-orange-500/40' : 'border-cyan-500/40'
        }`}>
          {/* Top highlight */}
          <div className={`absolute top-0 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent to-transparent transition-colors duration-500 ${
            showMaxTemp ? 'via-orange-400/50' : 'via-cyan-400/50'
          }`} />
          
          <span className={`font-bold uppercase tracking-wider text-[6px] sm:text-[7px] lg:text-[8px] xl:text-[9px] 3xl:text-xs 4k:text-sm transition-colors duration-500 ${
            showMaxTemp ? 'text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]' : 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]'
          }`}>
            {showMaxTemp ? 'Máx' : 'Mín'}
          </span>
          <div className="flex items-baseline">
            <span className={`font-black text-transparent bg-clip-text tabular-nums text-base sm:text-lg lg:text-xl xl:text-2xl 3xl:text-3xl 4k:text-4xl drop-shadow-lg transition-all duration-500 ${
              showMaxTemp ? 'bg-gradient-to-b from-white via-orange-50 to-orange-100' : 'bg-gradient-to-b from-white via-cyan-50 to-cyan-100'
            }`} style={{ fontFamily: "'Orbitron', sans-serif" }}>
              {showMaxTemp ? maxTemp : minTemp}
            </span>
            <span className={`font-bold text-[9px] sm:text-[10px] lg:text-xs xl:text-sm 3xl:text-base 4k:text-lg transition-colors duration-500 ${
              showMaxTemp ? 'text-orange-400 drop-shadow-[0_0_6px_rgba(251,146,60,0.5)]' : 'text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]'
            }`}>°C</span>
          </div>
        </div>
      </div>

      {/* Humidity - 3D Glass Card */}
      <div className="relative shrink-0 group">
        {/* Glow */}
        <div className="absolute -inset-1 bg-gradient-to-br from-blue-500/25 to-cyan-500/15 rounded-xl blur-md opacity-60 group-hover:opacity-100 transition-opacity" />
        
        <div className="relative flex flex-col items-center bg-gradient-to-br from-slate-800/80 via-slate-900/90 to-black/80 rounded-xl px-2 sm:px-2.5 lg:px-3 py-1 sm:py-1.5 border border-blue-500/40 shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1),0_0_15px_rgba(59,130,246,0.1)]">
          {/* Top highlight */}
          <div className="absolute top-0 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />
          
          <Droplets className="w-3.5 h-3.5 lg:w-4 lg:h-4 xl:w-5 xl:h-5 3xl:w-6 3xl:h-6 text-cyan-400 shrink-0 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)] animate-pulse" />
          <span className="font-bold text-transparent bg-clip-text bg-gradient-to-b from-white via-blue-50 to-cyan-100 tabular-nums text-[10px] sm:text-xs lg:text-sm xl:text-base 3xl:text-lg 4k:text-xl drop-shadow-lg" style={{ fontFamily: "'Orbitron', sans-serif" }}>
            {weather.current.humidity}%
          </span>
        </div>
      </div>

      {/* Forecast Cards - 3D Glass Style - visible on md+ */}
      <div className="hidden md:flex gap-1.5 lg:gap-2 shrink-0">
        {weather.forecast?.slice(0, 2).map((day, index) => {
          const dayNames = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
          const today = currentTime;
          const targetDate = new Date(today);
          targetDate.setDate(targetDate.getDate() + index);
          const dayName = index === 0 ? 'HOJE' : dayNames[targetDate.getDay()];

          return (
            <div key={index} className="relative group">
              {/* Glow effect */}
              <div className={`absolute -inset-0.5 rounded-xl blur-md opacity-50 group-hover:opacity-80 transition-opacity ${
                index === 0 ? 'bg-gradient-to-br from-amber-500/40 to-orange-500/30' : 'bg-gradient-to-br from-purple-500/30 to-indigo-500/20'
              }`} />
              
              <div className={`relative flex flex-col items-center bg-gradient-to-br from-slate-800/80 via-slate-900/90 to-black/80 rounded-xl px-1.5 lg:px-2 py-1 lg:py-1.5 border shadow-[0_4px_12px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] ${
                index === 0 ? 'border-amber-500/40' : 'border-purple-500/30'
              }`}>
                {/* Top highlight */}
                <div className={`absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent to-transparent ${
                  index === 0 ? 'via-amber-400/50' : 'via-purple-400/40'
                }`} />
                
                <span className={`font-bold text-[7px] lg:text-[8px] xl:text-[9px] 3xl:text-xs 4k:text-sm tracking-wide ${
                  index === 0 ? 'text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]' : 'text-purple-300 drop-shadow-[0_0_4px_rgba(168,85,247,0.4)]'
                }`}>
                  {dayName}
                </span>
                
                <div className="my-0.5 lg:my-1">
                  <Weather3DIcon description={day.icon || 'cloud'} size="sm" />
                </div>
                
                <div className="flex items-center gap-0.5">
                  <span className="text-cyan-300 font-bold tabular-nums text-[7px] lg:text-[8px] xl:text-[9px] 3xl:text-xs 4k:text-sm drop-shadow-sm">
                    {day.minTemp}°
                  </span>
                  <span className="text-white/40 font-bold text-[6px] lg:text-[7px]">/</span>
                  <span className="text-orange-300 font-bold tabular-nums text-[7px] lg:text-[8px] xl:text-[9px] 3xl:text-xs 4k:text-sm drop-shadow-sm">
                    {day.maxTemp}°
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Animated Light Separator */}
      <div className="relative flex items-center justify-center shrink-0 w-6 sm:w-8 lg:w-10 h-12 sm:h-16 lg:h-20">
        {/* Outer glow pulse */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div 
            className="w-8 sm:w-10 lg:w-12 h-8 sm:h-10 lg:h-12 rounded-full blur-xl animate-pulse"
            style={{ 
              background: 'radial-gradient(circle, rgba(6, 182, 212, 0.4) 0%, rgba(147, 51, 234, 0.2) 50%, transparent 70%)',
              animationDuration: '2s'
            }}
          />
        </div>
        
        {/* Main vertical light beam */}
        <div className="relative w-0.5 sm:w-[3px] h-10 sm:h-14 lg:h-16">
          {/* Base gradient line */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/60 to-transparent rounded-full" />
          
          {/* Animated light traveling up */}
          <div 
            className="absolute inset-x-0 h-4 sm:h-6 rounded-full animate-[separatorLightUp_2s_ease-in-out_infinite]"
            style={{ 
              background: 'linear-gradient(to top, transparent, rgba(6, 182, 212, 0.9), rgba(255, 255, 255, 1), rgba(6, 182, 212, 0.9), transparent)',
              boxShadow: '0 0 12px rgba(6, 182, 212, 0.8), 0 0 24px rgba(6, 182, 212, 0.4)'
            }}
          />
          
          {/* Animated light traveling down (delayed) */}
          <div 
            className="absolute inset-x-0 h-3 sm:h-4 rounded-full animate-[separatorLightDown_2s_ease-in-out_infinite]"
            style={{ 
              background: 'linear-gradient(to bottom, transparent, rgba(168, 85, 247, 0.8), rgba(255, 255, 255, 0.9), rgba(168, 85, 247, 0.8), transparent)',
              boxShadow: '0 0 10px rgba(168, 85, 247, 0.7), 0 0 20px rgba(168, 85, 247, 0.3)',
              animationDelay: '1s'
            }}
          />
          
          {/* Glow effect on line */}
          <div 
            className="absolute inset-0 rounded-full blur-sm"
            style={{ 
              background: 'linear-gradient(to bottom, transparent 10%, rgba(6, 182, 212, 0.5) 30%, rgba(147, 51, 234, 0.5) 70%, transparent 90%)'
            }}
          />
        </div>
        
        {/* Center orb */}
        <div className="absolute flex items-center justify-center">
          {/* Outer ring */}
          <div 
            className="absolute w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 rounded-full animate-ping opacity-40"
            style={{ 
              background: 'radial-gradient(circle, rgba(6, 182, 212, 0.6) 0%, transparent 70%)',
              animationDuration: '2s'
            }}
          />
          
          {/* Core orb with 3D effect */}
          <div 
            className="relative w-2 h-2 sm:w-2.5 sm:h-2.5 lg:w-3 lg:h-3 rounded-full animate-pulse"
            style={{ 
              background: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 1), rgba(6, 182, 212, 0.9) 50%, rgba(147, 51, 234, 0.8))',
              boxShadow: '0 0 8px rgba(6, 182, 212, 0.9), 0 0 16px rgba(6, 182, 212, 0.5), 0 0 24px rgba(147, 51, 234, 0.3), inset 0 -1px 2px rgba(0, 0, 0, 0.3)',
              animationDuration: '1.5s'
            }}
          />
        </div>
        
        {/* Sparkle particles */}
        <div 
          className="absolute w-1 h-1 rounded-full bg-white animate-[sparkle_3s_ease-in-out_infinite]"
          style={{ top: '15%', left: '30%' }}
        />
        <div 
          className="absolute w-0.5 h-0.5 rounded-full bg-cyan-300 animate-[sparkle_3s_ease-in-out_infinite]"
          style={{ top: '70%', right: '25%', animationDelay: '1s' }}
        />
        <div 
          className="absolute w-0.5 h-0.5 rounded-full bg-purple-300 animate-[sparkle_3s_ease-in-out_infinite]"
          style={{ top: '40%', left: '70%', animationDelay: '2s' }}
        />
      </div>

      {/* Date + Clock */}
      {renderDateTimeCompact()}
    </div>
  );
}
