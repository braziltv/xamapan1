import { useEffect, useState, useRef, useCallback } from 'react';
import { Cloud, Droplets, Sun, CloudRain, CloudSnow, CloudLightning, Wind, CloudSun, MapPin, Thermometer, ThermometerSun, ThermometerSnowflake, Calendar, Clock } from 'lucide-react';
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

// Modern animated weather icon with glassmorphism
function Weather3DIcon({ description, size = 'sm' }: { description: string; size?: 'sm' | 'lg' }) {
  const desc = description.toLowerCase();
  
  const sizeClasses = size === 'lg' 
    ? 'w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 xl:w-14 xl:h-14' 
    : 'w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7';

  const iconSizeClasses = size === 'lg'
    ? 'w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 xl:w-9 xl:h-9'
    : 'w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5';

  let IconComponent = CloudSun;
  let iconColor = 'text-amber-300';
  let glowColor = 'rgba(251, 191, 36, 0.6)';
  let bgGradient = 'from-amber-500/20 to-orange-500/10';
  let animation = 'animate-weather-sun-pulse';
  let showRaindrops = false;
  let showLightning = false;
  let showSnowflakes = false;
  
  if (desc.includes('sunny') || desc.includes('clear') || desc.includes('sol') || desc.includes('limpo')) {
    IconComponent = Sun;
    iconColor = 'text-yellow-300';
    glowColor = 'rgba(253, 224, 71, 0.7)';
    bgGradient = 'from-yellow-500/30 to-amber-500/15';
    animation = 'animate-spin-slow';
  } else if (desc.includes('partly') || desc.includes('parcialmente')) {
    IconComponent = CloudSun;
    iconColor = 'text-amber-200';
    glowColor = 'rgba(251, 191, 36, 0.5)';
    bgGradient = 'from-amber-500/20 to-slate-500/10';
    animation = 'animate-weather-cloud-drift';
  } else if (desc.includes('rain') || desc.includes('shower') || desc.includes('chuva') || desc.includes('pancada')) {
    IconComponent = CloudRain;
    iconColor = 'text-sky-300';
    glowColor = 'rgba(56, 189, 248, 0.6)';
    bgGradient = 'from-sky-500/25 to-blue-500/15';
    animation = 'animate-bounce-subtle';
    showRaindrops = true;
  } else if (desc.includes('thunder') || desc.includes('storm') || desc.includes('trovoada') || desc.includes('tempestade')) {
    IconComponent = CloudLightning;
    iconColor = 'text-violet-300';
    glowColor = 'rgba(196, 181, 253, 0.7)';
    bgGradient = 'from-violet-500/25 to-purple-500/15';
    animation = 'animate-pulse';
    showRaindrops = true;
    showLightning = true;
  } else if (desc.includes('snow') || desc.includes('neve')) {
    IconComponent = CloudSnow;
    iconColor = 'text-cyan-200';
    glowColor = 'rgba(165, 243, 252, 0.6)';
    bgGradient = 'from-cyan-500/25 to-blue-500/10';
    animation = 'animate-weather-snow-float';
    showSnowflakes = true;
  } else if (desc.includes('fog') || desc.includes('mist') || desc.includes('neblina') || desc.includes('nevoeiro')) {
    IconComponent = Wind;
    iconColor = 'text-slate-300';
    glowColor = 'rgba(203, 213, 225, 0.5)';
    bgGradient = 'from-slate-500/20 to-gray-500/10';
    animation = 'animate-weather-fog-drift';
  } else if (desc.includes('cloud') || desc.includes('nublado') || desc.includes('encoberto')) {
    IconComponent = Cloud;
    iconColor = 'text-slate-300';
    glowColor = 'rgba(203, 213, 225, 0.5)';
    bgGradient = 'from-slate-500/25 to-gray-500/15';
    animation = 'animate-weather-cloud-drift';
  }

  if (size === 'lg') {
    return (
      <div className="relative group">
        {/* Animated outer ring */}
        <div 
          className="absolute -inset-1 rounded-full animate-spin-slow opacity-60"
          style={{ 
            background: `conic-gradient(from 0deg, transparent, ${glowColor}, transparent)`,
            animationDuration: '8s',
          }}
        />
        
        {/* Glassmorphism container */}
        <div 
          className={`relative ${sizeClasses} flex items-center justify-center rounded-full bg-gradient-to-br ${bgGradient} backdrop-blur-sm border border-white/20`}
          style={{
            boxShadow: `0 0 20px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.2)`,
          }}
        >
          {/* Inner glow */}
          <div 
            className="absolute inset-1 rounded-full"
            style={{ 
              background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3) 0%, transparent 50%)`,
            }}
          />
          
          {/* Raindrops effect */}
          {showRaindrops && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-full">
              {[...Array(4)].map((_, i) => (
                <div 
                  key={i}
                  className="absolute w-0.5 h-2 bg-gradient-to-b from-sky-400/90 to-transparent rounded-full animate-raindrop-fall"
                  style={{ 
                    left: `${20 + i * 20}%`, 
                    top: '60%',
                    animationDelay: `${i * 0.2}s`,
                    animationDuration: '1s',
                  }} 
                />
              ))}
            </div>
          )}
          
          {/* Lightning flash effect */}
          {showLightning && (
            <div 
              className="absolute inset-0 rounded-full animate-lightning-flash"
              style={{ background: 'rgba(255,255,255,0.4)' }}
            />
          )}
          
          {/* Snowflakes effect */}
          {showSnowflakes && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-full">
              {[...Array(3)].map((_, i) => (
                <div 
                  key={i}
                  className="absolute w-1 h-1 bg-white/80 rounded-full animate-snowflake-fall"
                  style={{ 
                    left: `${25 + i * 25}%`, 
                    top: '55%',
                    animationDelay: `${i * 0.4}s`,
                    animationDuration: '2s',
                  }} 
                />
              ))}
            </div>
          )}
          
          <div className={animation}>
            <IconComponent 
              className={`${iconSizeClasses} ${iconColor} drop-shadow-lg`}
              strokeWidth={1.5}
              style={{ 
                filter: `drop-shadow(0 0 10px ${glowColor})`,
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Small icon version
  return (
    <div 
      className={`relative flex items-center justify-center rounded-full p-1 bg-gradient-to-br ${bgGradient}`}
      style={{ boxShadow: `0 0 8px ${glowColor}` }}
    >
      <IconComponent 
        className={`${iconSizeClasses} ${iconColor} ${animation}`}
        strokeWidth={1.5}
        style={{ filter: `drop-shadow(0 0 4px ${glowColor})` }}
      />
    </div>
  );
}

// Modern animated stat card
function StatCard({ 
  label, 
  value, 
  unit, 
  icon: Icon, 
  colorScheme = 'cyan',
  isAnimating = false,
}: { 
  label: string; 
  value: string | number; 
  unit?: string; 
  icon: React.ElementType;
  colorScheme?: 'cyan' | 'rose' | 'amber' | 'emerald' | 'violet';
  isAnimating?: boolean;
}) {
  const colors = {
    cyan: {
      border: 'border-cyan-500/40',
      bg: 'from-cyan-500/15 to-cyan-600/5',
      label: 'text-cyan-400',
      value: 'text-cyan-300',
      icon: 'text-cyan-400',
      glow: '0 0 20px rgba(6,182,212,0.3)',
    },
    rose: {
      border: 'border-rose-500/40',
      bg: 'from-rose-500/15 to-rose-600/5',
      label: 'text-rose-400',
      value: 'text-rose-300',
      icon: 'text-rose-400',
      glow: '0 0 20px rgba(244,63,94,0.3)',
    },
    amber: {
      border: 'border-amber-500/40',
      bg: 'from-amber-500/15 to-amber-600/5',
      label: 'text-amber-400',
      value: 'text-amber-300',
      icon: 'text-amber-400',
      glow: '0 0 20px rgba(245,158,11,0.3)',
    },
    emerald: {
      border: 'border-emerald-500/40',
      bg: 'from-emerald-500/15 to-emerald-600/5',
      label: 'text-emerald-400',
      value: 'text-emerald-300',
      icon: 'text-emerald-400',
      glow: '0 0 20px rgba(16,185,129,0.3)',
    },
    violet: {
      border: 'border-violet-500/40',
      bg: 'from-violet-500/15 to-violet-600/5',
      label: 'text-violet-400',
      value: 'text-violet-300',
      icon: 'text-violet-400',
      glow: '0 0 20px rgba(139,92,246,0.3)',
    },
  };

  const c = colors[colorScheme];

  return (
    <div 
      className={`relative shrink-0 flex flex-col items-center justify-center rounded-xl lg:rounded-2xl border ${c.border} overflow-hidden group transition-all duration-300 hover:scale-105`}
      style={{
        background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,41,59,0.9) 100%)',
        boxShadow: c.glow,
        padding: 'clamp(0.375rem, 1vw, 0.75rem) clamp(0.5rem, 1.2vw, 1rem)',
      }}
    >
      {/* Animated shine effect */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
          transform: 'translateX(-100%)',
          animation: isAnimating ? 'shimmer-slide 2s infinite' : 'none',
        }}
      />
      
      {/* Top gradient accent */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${c.bg} opacity-80`} />
      
      {/* Icon + Label row */}
      <div className="flex items-center gap-1 mb-0.5 relative z-10">
        <Icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 ${c.icon} ${isAnimating ? 'animate-bounce-subtle' : ''}`} strokeWidth={2} />
        <span className={`font-bold uppercase tracking-wider whitespace-nowrap ${c.label}`} style={{ fontSize: 'clamp(0.45rem, 0.7vw, 0.65rem)' }}>
          {label}
        </span>
      </div>
      
      {/* Value */}
      <div className="flex items-baseline gap-0.5 relative z-10">
        <span 
          className={`font-black tabular-nums ${c.value}`} 
          style={{ 
            fontFamily: "'Orbitron', sans-serif",
            fontSize: 'clamp(1rem, 2vw, 1.75rem)',
            textShadow: '0 0 10px rgba(255,255,255,0.3)',
          }}
        >
          {value}
        </span>
        {unit && (
          <span className={`font-bold ${c.label}`} style={{ fontSize: 'clamp(0.45rem, 0.8vw, 0.7rem)' }}>
            {unit}
          </span>
        )}
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
  const [isTransitioning, setIsTransitioning] = useState(false);
  const fetchingRef = useRef(false);

  const availableCities = Object.keys(weatherCache);
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
      } else {
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

  const changeCityWithTransition = useCallback((newCity: string) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setDisplayCity(newCity);
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 300);
  }, []);

  useEffect(() => {
    if (availableCities.length === 0) return;
    
    const sortedCities = [...availableCities].sort((a, b) => {
      if (a === 'Paineiras') return -1;
      if (b === 'Paineiras') return 1;
      return a.localeCompare(b, 'pt-BR');
    });
    
    let currentIndex = 0;
    
    if (sortedCities[0]) {
      setDisplayCity(sortedCities[0]);
    }
    
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % sortedCities.length;
      changeCityWithTransition(sortedCities[currentIndex]);
      setRotationCount(prev => prev + 1);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [availableCities.length, weatherCache, changeCityWithTransition]);

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

  // Modern animated clock widget
  const renderDateTimeCompact = () => {
    const hours = safeFormatTime(currentTime, 'HH');
    const minutes = safeFormatTime(currentTime, 'mm');
    const seconds = safeFormatTime(currentTime, 'ss');
    
    return (
      <div className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Date pills with animated icons */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <div className="flex items-center gap-1 bg-gradient-to-r from-amber-500/25 to-amber-600/15 rounded-full px-1.5 sm:px-2 lg:px-2.5 py-0.5 sm:py-1 border border-amber-400/50 shadow-lg"
               style={{ boxShadow: '0 0 12px rgba(245,158,11,0.25)' }}>
            <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-3.5 lg:h-3.5 text-amber-400 animate-pulse" strokeWidth={2} />
            <p className="font-bold text-amber-300 leading-tight whitespace-nowrap uppercase tracking-wide text-[0.5rem] sm:text-[0.55rem] lg:text-xs"
               style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
              {safeFormatTime(currentTime, 'EEEE')}
            </p>
          </div>
          <div className="flex items-center gap-1 bg-gradient-to-r from-slate-700/60 to-slate-800/50 rounded-full px-1.5 sm:px-2 lg:px-2.5 py-0.5 sm:py-1 border border-slate-500/50 shadow-lg">
            <p className="font-semibold text-white leading-tight whitespace-nowrap text-[0.5rem] sm:text-[0.55rem] lg:text-xs"
               style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
              {safeFormatTime(currentTime, 'dd/MM/yyyy')}
            </p>
          </div>
        </div>
        
        {/* Modern Digital Clock */}
        <div 
          className="relative flex items-center bg-gradient-to-br from-slate-900/98 to-slate-800/95 rounded-xl lg:rounded-2xl px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5 lg:py-2 overflow-hidden"
          style={{
            border: '2px solid rgba(6,182,212,0.5)',
            boxShadow: '0 0 25px rgba(6,182,212,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
        >
          {/* Animated background pulse */}
          <div 
            className="absolute inset-0 opacity-20 animate-pulse"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(6,182,212,0.4) 0%, transparent 70%)',
            }}
          />
          
          {/* Clock icon */}
          <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 text-cyan-400 mr-1 sm:mr-1.5 animate-spin-slow shrink-0" style={{ animationDuration: '10s' }} />
          
          {/* Hours */}
          <span 
            className="font-mono font-black text-cyan-300 tracking-tight relative z-10" 
            style={{ 
              fontFamily: "'Orbitron', 'SF Mono', monospace",
              fontSize: 'clamp(1.1rem, 2.2vw, 2rem)',
              textShadow: '0 0 15px rgba(6,182,212,0.7)',
            }}
          >
            {hours}
          </span>
          
          {/* Animated colon separator */}
          <div className="flex flex-col items-center justify-center gap-0.5 sm:gap-1 mx-0.5 sm:mx-1 lg:mx-1.5 relative z-10">
            <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-cyan-400 animate-pulse" style={{ boxShadow: '0 0 6px rgba(6,182,212,0.8)' }} />
            <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-cyan-400 animate-pulse" style={{ boxShadow: '0 0 6px rgba(6,182,212,0.8)', animationDelay: '0.5s' }} />
          </div>
          
          {/* Minutes */}
          <span 
            className="font-mono font-black text-cyan-300 tracking-tight relative z-10" 
            style={{ 
              fontFamily: "'Orbitron', 'SF Mono', monospace",
              fontSize: 'clamp(1.1rem, 2.2vw, 2rem)',
              textShadow: '0 0 15px rgba(6,182,212,0.7)',
            }}
          >
            {minutes}
          </span>
          
          {/* Seconds with highlight */}
          <div className="ml-1 sm:ml-1.5 lg:ml-2 px-1 sm:px-1.5 py-0.5 bg-amber-500/20 rounded-md border border-amber-400/40 relative z-10">
            <span 
              className="font-mono font-bold text-amber-400" 
              style={{ 
                fontFamily: "'Orbitron', 'SF Mono', monospace",
                fontSize: 'clamp(0.6rem, 1vw, 0.9rem)',
                textShadow: '0 0 8px rgba(251,191,36,0.6)',
              }}
            >
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
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-600/50 animate-pulse">
          <Cloud className="w-5 h-5 sm:w-6 sm:h-6 text-white/70" />
          <span className="text-white/80 text-xs sm:text-sm">Carregando...</span>
        </div>
      </div>
    );
  }

  const weather = currentWeather || weatherCache['Paineiras'] || Object.values(weatherCache)[0];

  if (!weather) {
    return (
      <div className="flex items-center gap-2 sm:gap-3">
        {renderDateTimeCompact()}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-600/50">
          <Cloud className="w-5 h-5 sm:w-6 sm:h-6 text-white/50" />
          <span className="text-white/60 text-xs sm:text-sm">Indisponível</span>
        </div>
      </div>
    );
  }

  const todayForecast = weather.forecast?.[0];
  const maxTemp = todayForecast?.maxTemp ?? weather.current.temperature + 5;
  const minTemp = todayForecast?.minTemp ?? weather.current.temperature - 5;

  return (
    <div className="w-full flex items-center gap-2.5 sm:gap-3.5 lg:gap-4 xl:gap-6 justify-end flex-nowrap overflow-visible">
      {/* City Card - Adaptive width with visible overflow */}
      <div 
        className="shrink-0 flex flex-col items-center justify-center rounded-lg lg:rounded-xl border border-indigo-500/50 relative"
        style={{
          background: 'linear-gradient(145deg, rgba(30,41,70,0.98) 0%, rgba(49,46,129,0.6) 100%)',
          boxShadow: '0 0 25px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
          padding: 'clamp(0.35rem, 0.8vw, 0.6rem) clamp(0.5rem, 1vw, 0.85rem)',
          minWidth: 'fit-content',
        }}
      >
        {/* Animated top accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-400 via-indigo-500 to-violet-500 rounded-t-lg animate-shimmer-slide" style={{ backgroundSize: '200% 100%' }} />
        
        {/* Title: Previsão do Tempo */}
        <div className="flex items-center justify-center gap-1 mb-0.5">
          <span 
            className="font-bold text-cyan-300 uppercase tracking-wider whitespace-nowrap"
            style={{ 
              fontSize: 'clamp(0.45rem, 0.65vw, 0.6rem)',
              textShadow: '0 1px 4px rgba(0,0,0,0.7)',
              letterSpacing: '0.08em',
            }}
          >
            ☁️ Previsão do Tempo
          </span>
        </div>
        
        {/* City name with MapPin - adaptive sizing */}
        <div className="flex items-center gap-1 justify-center w-full">
          <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-4.5 lg:h-4.5 text-amber-400 shrink-0 animate-bounce-subtle" strokeWidth={2.5} />
          <span 
            className={`font-black text-amber-300 leading-none transition-all duration-300 text-center ${
              isTransitioning ? 'opacity-0 transform translate-y-1 scale-95' : 'opacity-100 transform translate-y-0 scale-100'
            }`}
            style={{ 
              textShadow: '0 2px 6px rgba(0,0,0,0.9), 0 0 12px rgba(251,191,36,0.5)',
              fontSize: displayCity.length > 12 
                ? 'clamp(0.75rem, 1.1vw, 0.95rem)' 
                : displayCity.length > 8 
                  ? 'clamp(0.85rem, 1.3vw, 1.1rem)' 
                  : displayCity.length > 5
                    ? 'clamp(0.95rem, 1.5vw, 1.25rem)'
                    : 'clamp(1.05rem, 1.7vw, 1.4rem)',
              letterSpacing: '0.01em',
              whiteSpace: 'nowrap',
            }}
            title={displayCity}
          >
            {displayCity}
          </span>
        </div>
      </div>

      {/* Current Temperature Card */}
      <StatCard
        label="Agora"
        value={weather.current.temperature}
        unit="°C"
        icon={Thermometer}
        colorScheme="cyan"
      />

      {/* Weather Icon + Humidity Card */}
      <div 
        className="shrink-0 flex flex-col items-center rounded-xl lg:rounded-2xl border border-amber-500/40 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,41,59,0.9) 100%)',
          boxShadow: '0 0 20px rgba(245,158,11,0.25), inset 0 1px 0 rgba(255,255,255,0.1)',
          padding: 'clamp(0.375rem, 1vw, 0.75rem) clamp(0.5rem, 1.2vw, 1rem)',
        }}
      >
        <Weather3DIcon description={weather.current.description} size="lg" />
        <div className="flex items-center gap-0.5 mt-1">
          <Droplets className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 text-cyan-400 shrink-0 animate-bounce-subtle" strokeWidth={2} />
          <span 
            className="font-bold text-cyan-300 tabular-nums"
            style={{ 
              fontSize: 'clamp(0.5rem, 0.9vw, 0.8rem)',
              textShadow: '0 1px 3px rgba(0,0,0,0.6)',
            }}
          >
            {weather.current.humidity}%
          </span>
        </div>
      </div>

      {/* Max/Min Temperature Card - Animated toggle */}
      <StatCard
        label={showMaxTemp ? 'Máxima' : 'Mínima'}
        value={showMaxTemp ? maxTemp : minTemp}
        unit="°C"
        icon={showMaxTemp ? ThermometerSun : ThermometerSnowflake}
        colorScheme={showMaxTemp ? 'rose' : 'cyan'}
        isAnimating={true}
      />

      {/* Date + Clock */}
      {renderDateTimeCompact()}
    </div>
  );
}
