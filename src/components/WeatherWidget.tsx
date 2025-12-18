import { useEffect, useState, useRef, useCallback } from 'react';
import { Cloud, Droplets, Sun, CloudRain, CloudSnow, CloudLightning, Wind, CloudSun, MapPin, Thermometer } from 'lucide-react';
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

function getWeatherIcon(description: string, size: 'sm' | 'md' | 'lg' | 'xl' = 'sm') {
  const desc = description.toLowerCase();
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };
  const iconClass = sizeClasses[size];
  
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

export function WeatherWidget({ currentTime, formatTime }: WeatherWidgetProps) {
  const [weatherCache, setWeatherCache] = useState<Record<string, WeatherData>>({});
  const [displayCity, setDisplayCity] = useState('Paineiras');
  const [previousCity, setPreviousCity] = useState('Paineiras');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const fetchingRef = useRef(false);

  const availableCities = Object.keys(weatherCache);
  const otherCities = availableCities.filter(c => c !== 'Paineiras');
  const currentWeather = weatherCache[displayCity];

  // Handle city transition animation
  const changeCityWithAnimation = useCallback((newCity: string) => {
    if (newCity === displayCity) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setPreviousCity(displayCity);
      setDisplayCity(newCity);
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 200);
  }, [displayCity]);

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
      if (weatherCache['Paineiras'] && Math.random() < 0.2) {
        changeCityWithAnimation('Paineiras');
      } else if (otherCities.length > 0) {
        currentIndex = (currentIndex + 1) % otherCities.length;
        changeCityWithAnimation(otherCities[currentIndex]);
      } else if (availableCities.length > 0) {
        currentIndex = (currentIndex + 1) % availableCities.length;
        changeCityWithAnimation(availableCities[currentIndex]);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [availableCities.length, otherCities.length, weatherCache, changeCityWithAnimation]);

  // Clock section component
  const ClockSection = () => {
    if (!currentTime || !formatTime) return null;
    
    return (
      <div className="flex flex-col items-center justify-center px-2 sm:px-4">
        <div className="flex items-baseline whitespace-nowrap">
          <span className="font-mono font-black text-white tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
            {formatTime(currentTime, 'HH:mm')}
          </span>
          <span className="font-mono font-bold text-amber-300 animate-pulse text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl">
            :{formatTime(currentTime, 'ss')}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="font-bold text-amber-300 uppercase text-xs sm:text-sm md:text-base">
            {formatTime(currentTime, "EEEE")}
          </span>
          <span className="text-white/50">•</span>
          <span className="font-semibold text-cyan-300 text-xs sm:text-sm md:text-base">
            {formatTime(currentTime, "dd/MM/yyyy")}
          </span>
        </div>
      </div>
    );
  };

  if (initialLoading && !currentWeather) {
    return (
      <div className="flex items-center gap-4">
        <Cloud className="w-8 h-8 text-white/70 animate-pulse" />
        <span className="text-white/80 text-base">Carregando...</span>
        <ClockSection />
      </div>
    );
  }

  const weather = currentWeather || weatherCache['Paineiras'] || Object.values(weatherCache)[0];

  if (!weather) {
    return (
      <div className="flex items-center gap-4">
        <Cloud className="w-8 h-8 text-white/50" />
        <span className="text-white/60 text-base">Indisponível</span>
        <ClockSection />
      </div>
    );
  }

  const todayForecast = weather.forecast?.[0];
  const maxTemp = todayForecast?.maxTemp ?? weather.current.temperature + 5;
  const minTemp = todayForecast?.minTemp ?? weather.current.temperature - 5;

  return (
    <div className="flex items-center gap-2 sm:gap-3 md:gap-4 lg:gap-6 flex-nowrap justify-end">
      {/* Clock Section */}
      <ClockSection />
      
      {/* Separator */}
      <div className="w-px h-12 sm:h-14 md:h-16 lg:h-20 bg-gradient-to-b from-transparent via-white/40 to-transparent shrink-0" />
      
      {/* Weather Main Card - With Animation */}
      <div className={`flex items-center gap-3 sm:gap-4 md:gap-5 bg-gradient-to-br from-sky-600/40 to-blue-800/40 rounded-2xl px-3 sm:px-4 md:px-5 lg:px-6 py-2 sm:py-3 md:py-4 backdrop-blur-md border border-white/20 shadow-xl shrink-0 transition-all duration-300 ease-out ${isTransitioning ? 'opacity-0 scale-95 blur-sm' : 'opacity-100 scale-100 blur-0'}`}>
        {/* Weather Icon - Large & Prominent */}
        <div className="relative shrink-0">
          <div className="absolute inset-0 bg-yellow-400/40 blur-2xl rounded-full scale-150" />
          <div className="relative bg-white/15 rounded-2xl p-2 sm:p-3 md:p-4 backdrop-blur-sm border border-white/20">
            {getWeatherIcon(weather.current.description, 'xl')}
          </div>
        </div>
        
        {/* Temperature Display - Very Prominent */}
        <div className="flex flex-col items-center shrink-0">
          <div className="flex items-start">
            <span className="font-black text-white drop-shadow-[0_4px_12px_rgba(255,255,255,0.4)] tabular-nums text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-none">
              {weather.current.temperature}
            </span>
            <span className="font-bold text-amber-300 text-xl sm:text-2xl md:text-3xl mt-1">°C</span>
          </div>
          {weather.current.feelsLike !== undefined && weather.current.feelsLike !== weather.current.temperature && (
            <span className="text-white/80 text-xs sm:text-sm whitespace-nowrap mt-1">
              Sensação: <span className="font-bold text-amber-300">{weather.current.feelsLike}°</span>
            </span>
          )}
        </div>
        
        {/* Min/Max & Humidity */}
        <div className="flex flex-col gap-1 sm:gap-2 shrink-0">
          {/* Max */}
          <div className="flex items-center gap-1 sm:gap-2 bg-orange-500/30 rounded-lg px-2 sm:px-3 py-1">
            <Thermometer className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400 shrink-0" />
            <span className="text-orange-300 font-bold text-sm sm:text-base md:text-lg">Máx</span>
            <span className="text-white font-black tabular-nums text-lg sm:text-xl md:text-2xl">{maxTemp}°</span>
          </div>
          {/* Min */}
          <div className="flex items-center gap-1 sm:gap-2 bg-cyan-500/30 rounded-lg px-2 sm:px-3 py-1">
            <Thermometer className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 shrink-0" />
            <span className="text-cyan-300 font-bold text-sm sm:text-base md:text-lg">Mín</span>
            <span className="text-white font-black tabular-nums text-lg sm:text-xl md:text-2xl">{minTemp}°</span>
          </div>
          {/* Humidity */}
          <div className="flex items-center gap-1 sm:gap-2 bg-blue-500/30 rounded-lg px-2 sm:px-3 py-1">
            <Droplets className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 shrink-0" />
            <span className="text-white font-black tabular-nums text-lg sm:text-xl md:text-2xl">{weather.current.humidity}%</span>
          </div>
        </div>
      </div>
      
      {/* City Name - Prominent Badge with Animation */}
      <div className={`flex flex-col items-center bg-gradient-to-br from-emerald-600/50 to-teal-700/50 rounded-xl px-3 sm:px-4 md:px-5 py-2 sm:py-3 backdrop-blur-sm border border-white/20 shadow-lg shrink-0 transition-all duration-300 ease-out ${isTransitioning ? 'opacity-0 scale-95 translate-y-2 blur-sm' : 'opacity-100 scale-100 translate-y-0 blur-0'}`}>
        <MapPin className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-amber-300 animate-bounce shrink-0" />
        <span className="font-black text-white uppercase tracking-wider text-sm sm:text-base md:text-lg lg:text-xl whitespace-nowrap">
          {displayCity}
        </span>
        <span className="text-emerald-300 font-bold text-xs sm:text-sm">MG</span>
      </div>
    </div>
  );
}