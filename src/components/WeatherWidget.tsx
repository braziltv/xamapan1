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

  // Modern digital clock design - larger and more visible
  const renderDateTimeCompact = () => {
    const hours = safeFormatTime(currentTime, 'HH');
    const minutes = safeFormatTime(currentTime, 'mm');
    const seconds = safeFormatTime(currentTime, 'ss');
    
    return (
      <div className="flex flex-col items-center gap-1 shrink-0">
        {/* Date pills */}
        <div className="flex items-center gap-1.5">
          <div className="bg-gradient-to-r from-amber-500/25 via-amber-400/35 to-amber-500/25 rounded-full px-2 sm:px-2.5 lg:px-3 xl:px-4 py-0.5 sm:py-1 border border-amber-400/50 backdrop-blur-sm shadow-[0_0_10px_rgba(251,191,36,0.2)]">
            <p className="font-bold text-amber-300 leading-tight whitespace-nowrap uppercase tracking-wider text-[8px] sm:text-[9px] lg:text-[10px] xl:text-xs 3xl:text-sm drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]">
              {safeFormatTime(currentTime, 'EEEE')}
            </p>
          </div>
          <div className="bg-white/15 rounded-full px-2 sm:px-2.5 lg:px-3 xl:px-4 py-0.5 sm:py-1 border border-cyan-400/40 backdrop-blur-sm shadow-[0_0_8px_rgba(6,182,212,0.15)]">
            <p className="font-semibold text-cyan-300 leading-tight whitespace-nowrap text-[8px] sm:text-[9px] lg:text-[10px] xl:text-xs 3xl:text-sm drop-shadow-[0_0_6px_rgba(6,182,212,0.5)]">
              {safeFormatTime(currentTime, 'dd/MM/yyyy')}
            </p>
          </div>
        </div>
        
        {/* Digital Clock Display - larger */}
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/25 via-blue-500/25 to-cyan-500/25 rounded-xl blur-md opacity-80" />
          
          <div className="relative flex items-center gap-1 bg-gradient-to-b from-slate-900/95 to-black/95 rounded-lg sm:rounded-xl px-2.5 sm:px-3 lg:px-4 xl:px-5 py-1 sm:py-1.5 lg:py-2 border border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.25),inset_0_2px_0_rgba(255,255,255,0.1)]">
            
            {/* Hours */}
            <span className="font-mono font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-100 via-cyan-300 to-cyan-400 tracking-tight text-xl sm:text-2xl lg:text-3xl xl:text-4xl 3xl:text-5xl drop-shadow-[0_0_12px_rgba(6,182,212,0.8)]" style={{ fontFamily: "'Orbitron', 'SF Mono', monospace", letterSpacing: '-0.02em' }}>
              {hours}
            </span>
            
            {/* Colon separator */}
            <div className="flex flex-col items-center justify-center gap-1 mx-1">
              <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 lg:w-2 lg:h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.9)]" />
              <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 lg:w-2 lg:h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.9)]" style={{ animationDelay: '0.5s' }} />
            </div>
            
            {/* Minutes */}
            <span className="font-mono font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-100 via-cyan-300 to-cyan-400 tracking-tight text-xl sm:text-2xl lg:text-3xl xl:text-4xl 3xl:text-5xl drop-shadow-[0_0_12px_rgba(6,182,212,0.8)]" style={{ fontFamily: "'Orbitron', 'SF Mono', monospace", letterSpacing: '-0.02em' }}>
              {minutes}
            </span>
            
            {/* Seconds */}
            <span className="font-mono font-bold text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-orange-400 text-xs sm:text-sm lg:text-base xl:text-lg 3xl:text-xl animate-pulse drop-shadow-[0_0_10px_rgba(251,191,36,0.7)] ml-1" style={{ fontFamily: "'Orbitron', 'SF Mono', monospace" }}>
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
    <div className="w-full flex items-center gap-2 sm:gap-3 lg:gap-4 xl:gap-5 justify-end flex-nowrap">
      {/* City + Weather Info - Compact Card - FIXED COLORS */}
      <div className="relative shrink-0">
        <div className="absolute -inset-1 bg-indigo-500/20 rounded-xl blur-md" />
        
        <div className="relative flex flex-col items-center justify-center bg-slate-900/95 rounded-lg lg:rounded-xl px-3 sm:px-4 lg:px-5 xl:px-6 py-2 sm:py-2.5 lg:py-3 xl:py-4 border border-indigo-400/40 shadow-lg min-w-[110px] sm:min-w-[130px] lg:min-w-[160px] xl:min-w-[200px]">
          <span className="font-bold text-slate-200 uppercase tracking-wider text-[9px] sm:text-[10px] lg:text-xs xl:text-sm whitespace-nowrap">
            Previsão do Tempo
          </span>
          <div className="flex items-center justify-center gap-1.5 w-full mt-1">
            <MapPin className={`w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 xl:w-5 xl:h-5 text-amber-400 shrink-0 transition-all duration-300 ${isTransitioning ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`} />
            <span 
              className={`font-black text-amber-300 leading-tight transition-all duration-300 ${
                isTransitioning ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'
              } ${
                displayCity.length > 18 
                  ? 'text-[9px] sm:text-[10px] lg:text-xs xl:text-sm' 
                  : displayCity.length > 12 
                    ? 'text-[10px] sm:text-xs lg:text-sm xl:text-base' 
                    : 'text-xs sm:text-sm lg:text-base xl:text-lg'
              }`}
            >
              {displayCity}-MG
            </span>
          </div>
        </div>
      </div>

      {/* Current Temperature - "AGORA" Card - FIXED COLORS */}
      <div className="relative shrink-0">
        <div className="absolute -inset-1 bg-cyan-500/20 rounded-xl blur-md" />
        
        <div className="relative flex flex-col items-center bg-slate-900/95 rounded-lg lg:rounded-xl px-3 sm:px-4 lg:px-5 xl:px-6 py-2 sm:py-2.5 lg:py-3 xl:py-4 border border-cyan-400/40 shadow-lg">
          <span className="font-bold text-cyan-400 uppercase tracking-wider text-[9px] sm:text-[10px] lg:text-xs xl:text-sm">
            Agora
          </span>
          <div className="flex items-baseline gap-0.5">
            <span className="font-black text-white tabular-nums text-lg sm:text-xl lg:text-2xl xl:text-3xl" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              {weather.current.temperature}
            </span>
            <span className="font-bold text-cyan-400 text-xs sm:text-sm lg:text-base">°C</span>
          </div>
        </div>
      </div>

      {/* 3D Weather Icon with Humidity below - FIXED */}
      <div className="relative shrink-0">
        <div className="absolute -inset-1 bg-amber-500/15 rounded-xl blur-md" />
        
        <div className="relative flex flex-col items-center bg-slate-900/95 rounded-lg lg:rounded-xl px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 lg:py-3 xl:py-4 border border-amber-400/40 shadow-lg">
          {/* Weather Icon */}
          <div className="scale-100 lg:scale-110 xl:scale-125">
            <Weather3DIcon description={weather.current.description} size="lg" />
          </div>
          
          {/* Humidity below icon */}
          <div className="flex items-center gap-1 mt-1.5 lg:mt-2">
            <Droplets className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 text-cyan-400 shrink-0" strokeWidth={1.5} />
            <span className="font-bold text-cyan-300 tabular-nums text-[10px] sm:text-xs lg:text-sm">
              {weather.current.humidity}%
            </span>
          </div>
        </div>
      </div>

      {/* Max/Min Temperature Card - Alternating - FIXED COLORS */}
      <div className="relative shrink-0">
        <div className={`absolute -inset-1 rounded-xl blur-md transition-all duration-500 ${
          showMaxTemp ? 'bg-rose-500/20' : 'bg-cyan-500/20'
        }`} />
        
        <div className={`relative flex flex-col items-center bg-slate-900/95 rounded-lg lg:rounded-xl px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 lg:py-3 xl:py-4 border shadow-lg transition-all duration-500 ${
          showMaxTemp ? 'border-rose-400/40' : 'border-cyan-400/40'
        }`}>
          <span className={`font-bold uppercase tracking-wider text-[9px] sm:text-[10px] lg:text-xs xl:text-sm transition-colors duration-500 ${
            showMaxTemp ? 'text-rose-400' : 'text-cyan-400'
          }`}>
            {showMaxTemp ? 'Máx' : 'Mín'}
          </span>
          <div className="flex items-baseline gap-0.5">
            <span className={`font-black tabular-nums text-lg sm:text-xl lg:text-2xl xl:text-3xl transition-all duration-500 ${
              showMaxTemp ? 'text-rose-200' : 'text-cyan-200'
            }`} style={{ fontFamily: "'Orbitron', sans-serif" }}>
              {showMaxTemp ? maxTemp : minTemp}
            </span>
            <span className={`font-bold text-xs sm:text-sm lg:text-base transition-colors duration-500 ${
              showMaxTemp ? 'text-rose-400' : 'text-cyan-400'
            }`}>°C</span>
          </div>
        </div>
      </div>

      {/* Forecast Cards - FIXED COLORS */}
      <div className="flex gap-1.5 sm:gap-2 lg:gap-2.5 xl:gap-3 shrink-0">
        {weather.forecast?.slice(0, 2).map((day, index) => {
          const dayNames = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
          const today = currentTime;
          const targetDate = new Date(today);
          targetDate.setDate(targetDate.getDate() + index);
          const dayName = index === 0 ? 'HOJE' : dayNames[targetDate.getDay()];

          return (
            <div 
              key={`forecast-${index}-${day.date}`} 
              className="relative"
            >
              <div className={`absolute -inset-1 rounded-xl blur-md ${
                index === 0 
                  ? 'bg-amber-500/20' 
                  : 'bg-purple-500/20'
              }`} />
              
              <div className={`relative flex flex-col items-center bg-slate-900/95 rounded-lg lg:rounded-xl px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 lg:py-3 xl:py-4 border shadow-lg ${
                index === 0 ? 'border-amber-400/40' : 'border-purple-400/40'
              }`}>
                <span className={`font-bold text-[9px] sm:text-[10px] lg:text-xs xl:text-sm tracking-wide ${
                  index === 0 
                    ? 'text-amber-300' 
                    : 'text-purple-300'
                }`}>
                  {dayName}
                </span>
                
                <div className="my-1.5 sm:my-2 scale-90 lg:scale-100 xl:scale-110">
                  <Weather3DIcon description={day.icon || 'cloud'} size="sm" />
                </div>
                
                <div className="flex items-center gap-1 lg:gap-1.5">
                  <span className="text-cyan-300 font-bold tabular-nums text-[9px] sm:text-[10px] lg:text-xs xl:text-sm">
                    {day.minTemp}°
                  </span>
                  <span className="text-white/50 font-bold text-[8px] lg:text-[10px]">/</span>
                  <span className="text-orange-300 font-bold tabular-nums text-[9px] sm:text-[10px] lg:text-xs xl:text-sm">
                    {day.maxTemp}°
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Date + Clock - Compact */}
      {renderDateTimeCompact()}
    </div>
  );
}
