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

// Simplified weather icon - reduced GPU load for TV performance
function Weather3DIcon({ description, size = 'sm' }: { description: string; size?: 'sm' | 'lg' }) {
  const desc = (description || '').toLowerCase();
  
  const sizeClasses = size === 'lg' 
    ? 'w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12' 
    : 'w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7';

  const iconSizeClasses = size === 'lg'
    ? 'w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8'
    : 'w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5';

  let IconComponent = CloudSun;
  let iconColor = 'text-amber-300';
  let bgColor = 'bg-amber-500/20';
  
  if (desc.includes('sunny') || desc.includes('clear') || desc.includes('sol') || desc.includes('limpo')) {
    IconComponent = Sun;
    iconColor = 'text-yellow-300';
    bgColor = 'bg-yellow-500/25';
  } else if (desc.includes('partly') || desc.includes('parcialmente')) {
    IconComponent = CloudSun;
    iconColor = 'text-amber-200';
    bgColor = 'bg-amber-500/20';
  } else if (desc.includes('rain') || desc.includes('shower') || desc.includes('chuva') || desc.includes('pancada')) {
    IconComponent = CloudRain;
    iconColor = 'text-sky-300';
    bgColor = 'bg-sky-500/25';
  } else if (desc.includes('thunder') || desc.includes('storm') || desc.includes('trovoada') || desc.includes('tempestade')) {
    IconComponent = CloudLightning;
    iconColor = 'text-violet-300';
    bgColor = 'bg-violet-500/25';
  } else if (desc.includes('snow') || desc.includes('neve')) {
    IconComponent = CloudSnow;
    iconColor = 'text-cyan-200';
    bgColor = 'bg-cyan-500/25';
  } else if (desc.includes('fog') || desc.includes('mist') || desc.includes('neblina') || desc.includes('nevoeiro')) {
    IconComponent = Wind;
    iconColor = 'text-slate-300';
    bgColor = 'bg-slate-500/20';
  } else if (desc.includes('cloud') || desc.includes('nublado') || desc.includes('encoberto')) {
    IconComponent = Cloud;
    iconColor = 'text-slate-300';
    bgColor = 'bg-slate-500/25';
  }

  if (size === 'lg') {
    return (
      <div 
        className={`${sizeClasses} flex items-center justify-center rounded-full ${bgColor} border border-white/20`}
      >
        <IconComponent 
          className={`${iconSizeClasses} ${iconColor}`}
          strokeWidth={1.5}
        />
      </div>
    );
  }

  // Small icon version
  return (
    <div className={`flex items-center justify-center rounded-full p-1 ${bgColor}`}>
      <IconComponent 
        className={`${iconSizeClasses} ${iconColor}`}
        strokeWidth={1.5}
      />
    </div>
  );
}

// Simplified stat card - reduced GPU load for TV performance
function StatCard({ 
  label, 
  value, 
  unit, 
  icon: Icon, 
  colorScheme = 'cyan',
}: { 
  label: string; 
  value: string | number; 
  unit?: string; 
  icon: React.ElementType;
  colorScheme?: 'cyan' | 'rose' | 'amber' | 'emerald' | 'violet';
}) {
  const colors = {
    cyan: { border: 'border-cyan-500/40', label: 'text-cyan-400', value: 'text-cyan-300', icon: 'text-cyan-400' },
    rose: { border: 'border-rose-500/40', label: 'text-rose-400', value: 'text-rose-300', icon: 'text-rose-400' },
    amber: { border: 'border-amber-500/40', label: 'text-amber-400', value: 'text-amber-300', icon: 'text-amber-400' },
    emerald: { border: 'border-emerald-500/40', label: 'text-emerald-400', value: 'text-emerald-300', icon: 'text-emerald-400' },
    violet: { border: 'border-violet-500/40', label: 'text-violet-400', value: 'text-violet-300', icon: 'text-violet-400' },
  };

  const c = colors[colorScheme];

  return (
    <div 
      className={`shrink-0 flex flex-col items-center justify-center rounded-xl lg:rounded-2xl border ${c.border} bg-slate-900/95`}
      style={{ padding: 'clamp(0.375rem, 1vw, 0.75rem) clamp(0.5rem, 1.2vw, 1rem)' }}
    >
      {/* Icon + Label row */}
      <div className="flex items-center gap-1 mb-0.5">
        <Icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 ${c.icon}`} strokeWidth={2} />
        <span className={`font-bold uppercase tracking-wider whitespace-nowrap ${c.label}`} style={{ fontSize: 'clamp(0.45rem, 0.7vw, 0.65rem)' }}>
          {label}
        </span>
      </div>
      
      {/* Value */}
      <div className="flex items-baseline gap-0.5">
        <span 
          className={`font-black tabular-nums ${c.value}`} 
          style={{ 
            fontFamily: "'Orbitron', sans-serif",
            fontSize: 'clamp(1rem, 2vw, 1.75rem)',
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

  // Simplified clock widget - reduced GPU load for TV performance
  const renderDateTimeCompact = () => {
    const hours = safeFormatTime(currentTime, 'HH');
    const minutes = safeFormatTime(currentTime, 'mm');
    const seconds = safeFormatTime(currentTime, 'ss');
    
    return (
      <div className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Date row */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <div className="flex items-center gap-1 bg-amber-500/20 rounded-full px-1.5 sm:px-2 lg:px-2.5 py-0.5 sm:py-1 border border-amber-400/50">
            <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-3.5 lg:h-3.5 text-amber-400" strokeWidth={2} />
            <p className="font-bold text-amber-300 leading-tight whitespace-nowrap uppercase tracking-wide text-[0.5rem] sm:text-[0.55rem] lg:text-xs">
              {safeFormatTime(currentTime, 'EEEE')}
            </p>
          </div>
          <div className="flex items-center gap-1 bg-slate-700/60 rounded-full px-1.5 sm:px-2 lg:px-2.5 py-0.5 sm:py-1 border border-slate-500/50">
            <p className="font-semibold text-white leading-tight whitespace-nowrap text-[0.5rem] sm:text-[0.55rem] lg:text-xs">
              {safeFormatTime(currentTime, 'dd/MM/yyyy')}
            </p>
          </div>
        </div>
        
        {/* Digital Clock - simplified */}
        <div 
          className="flex items-center bg-slate-900/95 rounded-xl lg:rounded-2xl px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5 lg:py-2 border-2 border-cyan-500/50"
        >
          {/* Clock icon */}
          <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 text-cyan-400 mr-1 sm:mr-1.5 shrink-0" />
          
          {/* Hours */}
          <span 
            className="font-mono font-black text-cyan-300 tracking-tight" 
            style={{ 
              fontFamily: "'Orbitron', 'SF Mono', monospace",
              fontSize: 'clamp(1.1rem, 2.2vw, 2rem)',
            }}
          >
            {hours}
          </span>
          
          {/* Colon separator */}
          <div className="flex flex-col items-center justify-center gap-0.5 sm:gap-1 mx-0.5 sm:mx-1 lg:mx-1.5">
            <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-cyan-400" />
            <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-cyan-400" />
          </div>
          
          {/* Minutes */}
          <span 
            className="font-mono font-black text-cyan-300 tracking-tight" 
            style={{ 
              fontFamily: "'Orbitron', 'SF Mono', monospace",
              fontSize: 'clamp(1.1rem, 2.2vw, 2rem)',
            }}
          >
            {minutes}
          </span>
          
          {/* Seconds */}
          <div className="ml-1 sm:ml-1.5 lg:ml-2 px-1 sm:px-1.5 py-0.5 bg-amber-500/20 rounded-md border border-amber-400/40">
            <span 
              className="font-mono font-bold text-amber-400" 
              style={{ 
                fontFamily: "'Orbitron', 'SF Mono', monospace",
                fontSize: 'clamp(0.6rem, 1vw, 0.9rem)',
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
    <div className="w-full flex items-center gap-1 sm:gap-1.5 lg:gap-2 justify-end flex-nowrap overflow-visible">
      {/* City Card - Simplified */}
      <div 
        className="shrink-0 flex flex-col items-center justify-center rounded-lg lg:rounded-xl border border-indigo-500/50 bg-slate-900/95 relative"
        style={{
          padding: 'clamp(0.35rem, 0.8vw, 0.6rem) clamp(0.5rem, 1vw, 0.85rem)',
          minWidth: 'fit-content',
        }}
      >
        {/* Top accent - static */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-400 via-indigo-500 to-violet-500 rounded-t-lg" />
        
        {/* Title: Previsão do Tempo */}
        <div className="flex items-center justify-center gap-1 mb-0.5">
          <span 
            className="font-bold text-cyan-300 uppercase tracking-wider whitespace-nowrap"
            style={{ 
              fontSize: 'clamp(0.45rem, 0.65vw, 0.6rem)',
              letterSpacing: '0.08em',
            }}
          >
            ☁️ Previsão do Tempo
          </span>
        </div>
        
        {/* City name with MapPin - simplified */}
        <div className="flex items-center gap-1 justify-center w-full">
          <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" strokeWidth={2.5} />
          <span 
            className={`font-black text-amber-300 leading-none text-center ${
              isTransitioning ? 'opacity-0' : 'opacity-100'
            }`}
            style={{ 
              fontSize: displayCity.length > 12 
                ? 'clamp(0.75rem, 1.1vw, 0.95rem)' 
                : displayCity.length > 8 
                  ? 'clamp(0.85rem, 1.3vw, 1.1rem)' 
                  : displayCity.length > 5
                    ? 'clamp(0.95rem, 1.5vw, 1.25rem)'
                    : 'clamp(1.05rem, 1.7vw, 1.4rem)',
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

      {/* Weather Icon + Humidity Card - simplified */}
      <div 
        className="shrink-0 flex flex-col items-center rounded-xl lg:rounded-2xl border border-amber-500/40 bg-slate-900/95"
        style={{ padding: 'clamp(0.375rem, 1vw, 0.75rem) clamp(0.5rem, 1.2vw, 1rem)' }}
      >
        <Weather3DIcon description={weather.current.description} size="lg" />
        <div className="flex items-center gap-0.5 mt-1">
          <Droplets className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 text-cyan-400 shrink-0" strokeWidth={2} />
          <span 
            className="font-bold text-cyan-300 tabular-nums"
            style={{ fontSize: 'clamp(0.5rem, 0.9vw, 0.8rem)' }}
          >
            {weather.current.humidity}%
          </span>
        </div>
      </div>

      {/* Max/Min Temperature Card */}
      <StatCard
        label={showMaxTemp ? 'Máxima' : 'Mínima'}
        value={showMaxTemp ? maxTemp : minTemp}
        unit="°C"
        icon={showMaxTemp ? ThermometerSun : ThermometerSnowflake}
        colorScheme={showMaxTemp ? 'rose' : 'cyan'}
      />

      {/* Date + Clock */}
      {renderDateTimeCompact()}
    </div>
  );
}
