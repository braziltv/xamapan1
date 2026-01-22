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

// Get contextual weather tip based on conditions
function getWeatherTip(description: string, temperature: number, humidity: number): string | null {
  const desc = description.toLowerCase();
  
  // Storm/Rain conditions
  if (desc.includes('thunder') || desc.includes('storm') || desc.includes('trovoada') || desc.includes('tempestade')) {
    return '⚡ Risco de tempestade — evite áreas abertas';
  }
  
  // Heavy rain
  if ((desc.includes('rain') || desc.includes('chuva')) && (desc.includes('heavy') || desc.includes('forte') || desc.includes('pancada'))) {
    return '🌧️ Risco de chuva forte à tarde';
  }
  
  // Light rain
  if (desc.includes('rain') || desc.includes('shower') || desc.includes('chuva') || desc.includes('garoa')) {
    return '☔ Tempo instável — leve guarda-chuva';
  }
  
  // Hot weather
  if (temperature >= 32) {
    return '🔥 Calor intenso — hidrate-se bem';
  }
  
  // Very hot and humid
  if (temperature >= 28 && humidity >= 70) {
    return '💧 Quente e úmido — beba água';
  }
  
  // Cold weather
  if (temperature <= 15) {
    return '🧥 Tempo frio — agasalhe-se';
  }
  
  // Fog/Mist
  if (desc.includes('fog') || desc.includes('mist') || desc.includes('neblina') || desc.includes('nevoeiro')) {
    return '🌫️ Neblina — dirija com cuidado';
  }
  
  // Cloudy/Overcast
  if (desc.includes('cloud') || desc.includes('nublado') || desc.includes('encoberto')) {
    if (humidity >= 80) {
      return '☁️ Tempo instável — pode chover';
    }
    return '☁️ Céu nublado — tempo ameno';
  }
  
  // Sunny/Clear
  if (desc.includes('sunny') || desc.includes('clear') || desc.includes('sol') || desc.includes('limpo')) {
    if (temperature >= 28) {
      return '☀️ Sol forte — use protetor solar';
    }
    return '☀️ Tempo bom — aproveite o dia';
  }
  
  // Partly cloudy
  if (desc.includes('partly') || desc.includes('parcialmente')) {
    return '🌤️ Sol entre nuvens — tempo agradável';
  }
  
  return null;
}

// Animated weather icons with subtle 5-8s loop animations
function Weather3DIcon({ description, size = 'sm' }: { description: string; size?: 'sm' | 'lg' }) {
  const desc = description.toLowerCase();
  
  const sizeClasses = size === 'lg' 
    ? 'w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 xl:w-12 xl:h-12 3xl:w-14 3xl:h-14 4k:w-16 4k:h-16' 
    : 'w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 3xl:w-7 3xl:h-7';

  const iconSizeClasses = size === 'lg'
    ? 'w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 xl:w-8 xl:h-8 3xl:w-9 3xl:h-9 4k:w-12 4k:h-12'
    : 'w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 3xl:w-5 3xl:h-5';

  // Determine icon type, colors and animation based on weather
  let IconComponent = CloudSun;
  let iconColor = 'text-amber-300';
  let glowColor = 'rgba(251, 191, 36, 0.5)';
  let animationClass = 'animate-weather-glow';
  let additionalEffects: React.ReactNode = null;
  
  if (desc.includes('sunny') || desc.includes('clear') || desc.includes('sol') || desc.includes('limpo')) {
    IconComponent = Sun;
    iconColor = 'text-yellow-300';
    glowColor = 'rgba(253, 224, 71, 0.6)';
    animationClass = 'animate-weather-sun';
  } else if (desc.includes('partly') || desc.includes('parcialmente')) {
    IconComponent = CloudSun;
    iconColor = 'text-amber-200';
    glowColor = 'rgba(251, 191, 36, 0.4)';
    animationClass = 'animate-weather-cloud-drift';
  } else if (desc.includes('rain') || desc.includes('shower') || desc.includes('chuva') || desc.includes('pancada')) {
    IconComponent = CloudRain;
    iconColor = 'text-sky-300';
    glowColor = 'rgba(56, 189, 248, 0.5)';
    animationClass = 'animate-weather-rain';
    // Rain drops effect
    if (size === 'lg') {
      additionalEffects = (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/4 w-0.5 h-2 bg-gradient-to-b from-sky-400/60 to-transparent rounded-full animate-weather-raindrop" style={{ animationDelay: '0s' }} />
          <div className="absolute top-1/2 left-1/2 w-0.5 h-2 bg-gradient-to-b from-sky-400/60 to-transparent rounded-full animate-weather-raindrop" style={{ animationDelay: '0.3s' }} />
          <div className="absolute top-1/2 left-3/4 w-0.5 h-2 bg-gradient-to-b from-sky-400/60 to-transparent rounded-full animate-weather-raindrop" style={{ animationDelay: '0.6s' }} />
        </div>
      );
    }
  } else if (desc.includes('thunder') || desc.includes('storm') || desc.includes('trovoada') || desc.includes('tempestade')) {
    IconComponent = CloudLightning;
    iconColor = 'text-violet-300';
    glowColor = 'rgba(196, 181, 253, 0.6)';
    animationClass = 'animate-weather-storm';
    // Lightning flash effect
    if (size === 'lg') {
      additionalEffects = (
        <div className="absolute inset-0 bg-white/5 rounded-full animate-weather-flash pointer-events-none" />
      );
    }
  } else if (desc.includes('snow') || desc.includes('neve')) {
    IconComponent = CloudSnow;
    iconColor = 'text-cyan-200';
    glowColor = 'rgba(165, 243, 252, 0.5)';
    animationClass = 'animate-weather-snow';
  } else if (desc.includes('fog') || desc.includes('mist') || desc.includes('neblina') || desc.includes('nevoeiro')) {
    IconComponent = Wind;
    iconColor = 'text-slate-300';
    glowColor = 'rgba(203, 213, 225, 0.4)';
    animationClass = 'animate-weather-fog';
  } else if (desc.includes('cloud') || desc.includes('nublado') || desc.includes('encoberto')) {
    IconComponent = Cloud;
    iconColor = 'text-slate-300';
    glowColor = 'rgba(203, 213, 225, 0.4)';
    animationClass = 'animate-weather-cloud-drift';
  }

  if (size === 'lg') {
    return (
      <div className="relative group">
        {/* Subtle outer glow with animation */}
        <div 
          className={`absolute -inset-2 rounded-full blur-lg opacity-30 ${animationClass}`}
          style={{ background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)` }}
        />
        
        {/* Additional weather effects */}
        {additionalEffects}
        
        {/* Minimalist container */}
        <div className={`relative ${sizeClasses} flex items-center justify-center`}>
          <div className={animationClass}>
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
        className={`${iconSizeClasses} ${iconColor} ${animationClass}`}
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

  useEffect(() => {
    if (availableCities.length === 0) return;
    
    let currentIndex = 0;
    
    const interval = setInterval(() => {
      setRotationCount(prev => {
        const next = prev + 1;
        if (next % 5 === 0 && weatherCache['Paineiras']) {
          changeCityWithTransition('Paineiras');
        } else if (otherCities.length > 0) {
          currentIndex = (currentIndex + 1) % otherCities.length;
          changeCityWithTransition(otherCities[currentIndex]);
        } else if (availableCities.length > 0) {
          currentIndex = (currentIndex + 1) % availableCities.length;
          changeCityWithTransition(availableCities[currentIndex]);
        }
        return next;
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [availableCities.length, otherCities.length, weatherCache, changeCityWithTransition]);

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
    <div className="w-full flex items-center gap-1.5 sm:gap-2 lg:gap-2.5 xl:gap-3 3xl:gap-4 justify-end flex-nowrap">
      {/* City + Weather Icon - Compact 3D Glass Card */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <div className="relative">
          {/* Glow effect behind city info */}
          <div className="absolute -inset-1 bg-gradient-to-br from-amber-500/15 to-orange-500/10 rounded-xl blur-sm" />
          
          <div className="relative flex flex-col items-center justify-center bg-gradient-to-br from-slate-800/80 via-slate-900/90 to-black/80 rounded-xl px-3 sm:px-4 lg:px-5 xl:px-6 py-2 sm:py-2.5 lg:py-3 border border-amber-500/30 shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] min-w-[160px] sm:min-w-[200px] lg:min-w-[250px] xl:min-w-[300px]">
            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-white uppercase tracking-wider text-[9px] sm:text-[11px] lg:text-xs xl:text-sm 3xl:text-base 4k:text-lg drop-shadow-md whitespace-nowrap">
              Previsão do Tempo
            </span>
            <div className="flex items-center justify-center gap-1.5 w-full mt-0.5">
              <MapPin className={`w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-3.5 lg:h-3.5 3xl:w-4 3xl:h-4 text-amber-400 shrink-0 drop-shadow-[0_0_4px_rgba(251,191,36,0.5)] transition-all duration-300 ${isTransitioning ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`} />
              <span 
                className={`font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400 drop-shadow-md leading-tight transition-all duration-300 ${
                  isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
                } ${
                  displayCity.length > 18 
                    ? 'text-[8px] sm:text-[9px] lg:text-[10px] xl:text-[11px] 3xl:text-xs 4k:text-sm' 
                    : displayCity.length > 12 
                      ? 'text-[9px] sm:text-[10px] lg:text-[11px] xl:text-xs 3xl:text-sm 4k:text-base' 
                      : 'text-[10px] sm:text-[11px] lg:text-xs xl:text-sm 3xl:text-base 4k:text-lg'
                }`}
              >
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

      {/* Weather Tip + Humidity - Combined Card - Always visible */}
      <div className="relative shrink-0">
        <div className="relative flex flex-col items-start bg-slate-900/60 rounded-lg px-1.5 sm:px-2 py-0.5 sm:py-1 border border-white/10 max-w-[100px] sm:max-w-[120px] lg:max-w-[140px] xl:max-w-[160px] 3xl:max-w-[180px] 4k:max-w-[220px]">
          {/* Contextual Weather Tip - Always displayed */}
          {getWeatherTip(weather.current.description, weather.current.temperature, weather.current.humidity) && (
            <span className="text-[6px] sm:text-[7px] lg:text-[8px] xl:text-[9px] 3xl:text-[10px] 4k:text-xs text-white/80 leading-tight animate-weather-tip line-clamp-2">
              {getWeatherTip(weather.current.description, weather.current.temperature, weather.current.humidity)}
            </span>
          )}
          {/* Humidity inline */}
          <div className="flex items-center gap-0.5 sm:gap-1 mt-0.5">
            <Droplets className="w-2 h-2 sm:w-2.5 sm:h-2.5 lg:w-3 lg:h-3 3xl:w-3.5 3xl:h-3.5 text-cyan-400/70 shrink-0" strokeWidth={1.5} />
            <span className="font-medium text-cyan-300/80 tabular-nums text-[7px] sm:text-[8px] lg:text-[9px] xl:text-[10px] 3xl:text-xs 4k:text-sm">
              {weather.current.humidity}%
            </span>
          </div>
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
