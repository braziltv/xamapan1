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

// Minimalist line icon weather component
function Weather3DIcon({ description, size = 'sm' }: { description: string; size?: 'sm' | 'lg' }) {
  const desc = description.toLowerCase();
  
  const sizeClasses = size === 'lg' 
    ? 'w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 xl:w-12 xl:h-12 3xl:w-14 3xl:h-14' 
    : 'w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 3xl:w-7 3xl:h-7';

  const iconSizeClasses = size === 'lg'
    ? 'w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 xl:w-8 xl:h-8 3xl:w-9 3xl:h-9'
    : 'w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 3xl:w-5 3xl:h-5';

  // Determine icon type, colors and animation with custom weather animations
  let IconComponent = CloudSun;
  let iconColor = 'text-amber-300';
  let glowColor = 'rgba(251, 191, 36, 0.5)';
  let animation = 'animate-weather-sun-pulse';
  let showRaindrops = false;
  
  if (desc.includes('sunny') || desc.includes('clear') || desc.includes('sol') || desc.includes('limpo')) {
    IconComponent = Sun;
    iconColor = 'text-yellow-300';
    glowColor = 'rgba(253, 224, 71, 0.6)';
    animation = 'animate-weather-sun-pulse';
  } else if (desc.includes('partly') || desc.includes('parcialmente')) {
    IconComponent = CloudSun;
    iconColor = 'text-amber-200';
    glowColor = 'rgba(251, 191, 36, 0.4)';
    animation = 'animate-weather-cloud-drift';
  } else if (desc.includes('rain') || desc.includes('shower') || desc.includes('chuva') || desc.includes('pancada')) {
    IconComponent = CloudRain;
    iconColor = 'text-sky-300';
    glowColor = 'rgba(56, 189, 248, 0.5)';
    animation = 'animate-weather-rain';
    showRaindrops = true;
  } else if (desc.includes('thunder') || desc.includes('storm') || desc.includes('trovoada') || desc.includes('tempestade')) {
    IconComponent = CloudLightning;
    iconColor = 'text-violet-300';
    glowColor = 'rgba(196, 181, 253, 0.6)';
    animation = 'animate-weather-storm';
    showRaindrops = true;
  } else if (desc.includes('snow') || desc.includes('neve')) {
    IconComponent = CloudSnow;
    iconColor = 'text-cyan-200';
    glowColor = 'rgba(165, 243, 252, 0.5)';
    animation = 'animate-weather-snow-float';
  } else if (desc.includes('fog') || desc.includes('mist') || desc.includes('neblina') || desc.includes('nevoeiro')) {
    IconComponent = Wind;
    iconColor = 'text-slate-300';
    glowColor = 'rgba(203, 213, 225, 0.4)';
    animation = 'animate-weather-fog-drift';
  } else if (desc.includes('cloud') || desc.includes('nublado') || desc.includes('encoberto')) {
    IconComponent = Cloud;
    iconColor = 'text-slate-300';
    glowColor = 'rgba(203, 213, 225, 0.4)';
    animation = 'animate-weather-cloud-drift';
  }

  if (size === 'lg') {
    return (
      <div className="relative group">
        {/* Subtle outer glow */}
        <div 
          className="absolute -inset-2 rounded-full blur-lg opacity-30"
          style={{ background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)` }}
        />
        
        {/* Minimalist container */}
        <div className={`relative ${sizeClasses} flex items-center justify-center`}>
          {/* Raindrops effect for rain/storm */}
          {showRaindrops && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute w-0.5 h-2 bg-gradient-to-b from-sky-400/80 to-transparent rounded-full left-1/4 top-1/2 animate-weather-raindrop" style={{ animationDelay: '0s' }} />
              <div className="absolute w-0.5 h-2 bg-gradient-to-b from-sky-400/80 to-transparent rounded-full left-1/2 top-1/2 animate-weather-raindrop" style={{ animationDelay: '0.3s' }} />
              <div className="absolute w-0.5 h-2 bg-gradient-to-b from-sky-400/80 to-transparent rounded-full left-3/4 top-1/2 animate-weather-raindrop" style={{ animationDelay: '0.6s' }} />
            </div>
          )}
          <div className={animation}>
            <IconComponent 
              className={`${iconSizeClasses} ${iconColor}`}
              strokeWidth={1.25}
              style={{ 
                filter: `drop-shadow(0 0 8px ${glowColor})`
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Small icon version - clean line style
  return (
    <div className="relative flex items-center justify-center">
      <IconComponent 
        className={`${iconSizeClasses} ${iconColor} ${animation}`}
        strokeWidth={1.25}
        style={{ 
          filter: `drop-shadow(0 0 4px ${glowColor})`
        }}
      />
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

  const changeCityWithTransition = useCallback((newCity: string) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setDisplayCity(newCity);
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 300);
  }, []);

  // Rotação sequencial por TODAS as cidades disponíveis
  useEffect(() => {
    if (availableCities.length === 0) return;
    
    // Ordenar cidades alfabeticamente, mas com Paineiras primeiro
    const sortedCities = [...availableCities].sort((a, b) => {
      if (a === 'Paineiras') return -1;
      if (b === 'Paineiras') return 1;
      return a.localeCompare(b, 'pt-BR');
    });
    
    let currentIndex = 0;
    
    // Mostrar cidade inicial
    if (sortedCities[0]) {
      setDisplayCity(sortedCities[0]);
    }
    
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % sortedCities.length;
      changeCityWithTransition(sortedCities[currentIndex]);
      setRotationCount(prev => prev + 1);
    }, 5000); // 5 segundos por cidade
    
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

  // Clean digital clock design - high contrast and legible
  const renderDateTimeCompact = () => {
    const hours = safeFormatTime(currentTime, 'HH');
    const minutes = safeFormatTime(currentTime, 'mm');
    const seconds = safeFormatTime(currentTime, 'ss');
    
    return (
      <div className="flex flex-col items-center gap-1.5 shrink-0">
        {/* Date pills - solid colors for legibility */}
        <div className="flex items-center gap-2">
          <div className="bg-amber-500/30 rounded-full px-3 sm:px-3.5 lg:px-4 xl:px-5 py-1 sm:py-1.5 border border-amber-400/60">
            <p className="font-bold text-amber-300 leading-tight whitespace-nowrap uppercase tracking-wide text-[9px] sm:text-[10px] lg:text-xs xl:text-sm 3xl:text-base"
               style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
              {safeFormatTime(currentTime, 'EEEE')}
            </p>
          </div>
          <div className="bg-slate-800/80 rounded-full px-3 sm:px-3.5 lg:px-4 xl:px-5 py-1 sm:py-1.5 border border-slate-600/60">
            <p className="font-semibold text-white leading-tight whitespace-nowrap text-[9px] sm:text-[10px] lg:text-xs xl:text-sm 3xl:text-base"
               style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
              {safeFormatTime(currentTime, 'dd/MM/yyyy')}
            </p>
          </div>
        </div>
        
        {/* Digital Clock Display - clean and bold */}
        <div className="flex items-center bg-slate-900/95 rounded-xl px-3 sm:px-4 lg:px-5 xl:px-6 py-1.5 sm:py-2 lg:py-2.5 border border-cyan-500/50 shadow-lg">
          {/* Hours */}
          <span className="font-mono font-black text-cyan-300 tracking-tight text-2xl sm:text-3xl lg:text-4xl xl:text-5xl 3xl:text-6xl" 
                style={{ fontFamily: "'Orbitron', 'SF Mono', monospace", textShadow: '0 0 15px rgba(6,182,212,0.6)' }}>
            {hours}
          </span>
          
          {/* Colon separator */}
          <div className="flex flex-col items-center justify-center gap-1.5 mx-1.5">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 lg:w-2.5 lg:h-2.5 rounded-full bg-cyan-400" />
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 lg:w-2.5 lg:h-2.5 rounded-full bg-cyan-400" />
          </div>
          
          {/* Minutes */}
          <span className="font-mono font-black text-cyan-300 tracking-tight text-2xl sm:text-3xl lg:text-4xl xl:text-5xl 3xl:text-6xl" 
                style={{ fontFamily: "'Orbitron', 'SF Mono', monospace", textShadow: '0 0 15px rgba(6,182,212,0.6)' }}>
            {minutes}
          </span>
          
          {/* Seconds */}
          <span className="font-mono font-bold text-amber-400 text-sm sm:text-base lg:text-lg xl:text-xl 3xl:text-2xl ml-2" 
                style={{ fontFamily: "'Orbitron', 'SF Mono', monospace", textShadow: '0 0 10px rgba(251,191,36,0.5)' }}>
            {seconds}
          </span>
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
    <div className="w-full flex items-center gap-1.5 sm:gap-2 lg:gap-2.5 xl:gap-3 justify-end flex-nowrap">
      {/* City Card - Allow text wrap for long names */}
      <div className="shrink-0 flex flex-col items-center justify-center bg-slate-900/95 rounded-lg px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 lg:py-2.5 border border-indigo-500/50 shadow-lg min-w-[70px] sm:min-w-[90px] lg:min-w-[110px] max-w-[120px] sm:max-w-[150px] lg:max-w-[180px]">
        <span className="font-bold text-slate-400 uppercase tracking-wider text-[7px] sm:text-[8px] lg:text-[9px] xl:text-[10px] whitespace-nowrap">
          Previsão
        </span>
        <div className="flex items-center gap-1 mt-0.5 w-full justify-center">
          <MapPin className={`w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 text-amber-400 shrink-0 transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`} />
          <span 
            className={`font-black text-amber-400 leading-tight transition-opacity duration-300 text-center ${
              isTransitioning ? 'opacity-0' : 'opacity-100'
            } text-[9px] sm:text-[10px] lg:text-xs xl:text-sm`}
            style={{ 
              textShadow: '0 1px 2px rgba(0,0,0,0.6)',
              wordBreak: 'break-word',
              hyphens: 'auto',
            }}
          >
            {displayCity}
          </span>
        </div>
      </div>

      {/* Current Temperature - Compact */}
      <div className="shrink-0 flex flex-col items-center justify-center bg-slate-900/95 rounded-lg px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 lg:py-2.5 border border-cyan-500/50 shadow-lg">
        <span className="font-bold text-cyan-400 uppercase tracking-wider text-[7px] sm:text-[8px] lg:text-[9px] xl:text-[10px] whitespace-nowrap">
          Agora
        </span>
        <div className="flex items-baseline gap-0.5 whitespace-nowrap">
          <span className="font-black text-white tabular-nums text-lg sm:text-xl lg:text-2xl xl:text-3xl" 
                style={{ fontFamily: "'Orbitron', sans-serif", textShadow: '0 0 10px rgba(255,255,255,0.4)' }}>
            {weather.current.temperature}
          </span>
          <span className="font-bold text-cyan-400 text-xs sm:text-sm lg:text-base">°C</span>
        </div>
      </div>

      {/* Weather Icon + Humidity - Compact */}
      <div className="shrink-0 flex flex-col items-center bg-slate-900/95 rounded-lg px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 lg:py-2.5 border border-amber-500/50 shadow-lg">
        <div className="scale-90 lg:scale-100">
          <Weather3DIcon description={weather.current.description} size="lg" />
        </div>
        <div className="flex items-center gap-0.5 mt-1">
          <Droplets className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 text-cyan-400 shrink-0" strokeWidth={1.5} />
          <span className="font-bold text-cyan-300 tabular-nums text-[10px] sm:text-xs lg:text-sm"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
            {weather.current.humidity}%
          </span>
        </div>
      </div>

      {/* Max/Min Temperature - Compact */}
      <div className={`shrink-0 flex flex-col items-center bg-slate-900/95 rounded-lg px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 lg:py-2.5 border shadow-lg transition-colors duration-500 ${
        showMaxTemp ? 'border-rose-500/50' : 'border-cyan-500/50'
      }`}>
        <span className={`font-bold uppercase tracking-wider text-[7px] sm:text-[8px] lg:text-[9px] xl:text-[10px] transition-colors duration-500 ${
          showMaxTemp ? 'text-rose-400' : 'text-cyan-400'
        }`}>
          {showMaxTemp ? 'Máx' : 'Mín'}
        </span>
        <div className="flex items-baseline gap-0.5">
          <span className={`font-black tabular-nums text-lg sm:text-xl lg:text-2xl xl:text-3xl transition-colors duration-500 ${
            showMaxTemp ? 'text-rose-300' : 'text-cyan-300'
          }`} style={{ fontFamily: "'Orbitron', sans-serif", textShadow: '0 0 6px rgba(255,255,255,0.2)' }}>
            {showMaxTemp ? maxTemp : minTemp}
          </span>
          <span className={`font-bold text-xs sm:text-sm lg:text-base transition-colors duration-500 ${
            showMaxTemp ? 'text-rose-400' : 'text-cyan-400'
          }`}>°C</span>
        </div>
      </div>

      {/* Forecast - Only 1 card for space */}
      {weather.forecast?.[0] && (
        <div className="shrink-0 flex flex-col items-center bg-slate-900/95 rounded-lg px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 lg:py-2.5 border border-purple-500/50 shadow-lg">
          <span className="font-bold text-purple-400 text-[7px] sm:text-[8px] lg:text-[9px] xl:text-[10px] tracking-wide">
            HOJE
          </span>
          <div className="my-1 scale-75 lg:scale-90">
            <Weather3DIcon description={weather.forecast[0].icon || 'cloud'} size="sm" />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-cyan-300 font-bold tabular-nums text-[9px] sm:text-[10px] lg:text-xs">
              {weather.forecast[0].minTemp}°
            </span>
            <span className="text-slate-500 text-[8px]">/</span>
            <span className="text-orange-400 font-bold tabular-nums text-[9px] sm:text-[10px] lg:text-xs">
              {weather.forecast[0].maxTemp}°
            </span>
          </div>
        </div>
      )}

      {/* Date + Clock - Compact */}
      {renderDateTimeCompact()}
    </div>
  );
}
