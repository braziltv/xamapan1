import { useEffect, useState, useRef, useCallback } from 'react';
import { Cloud, Droplets, Sun, CloudRain, CloudSnow, CloudLightning, Wind, CloudSun, MapPin } from 'lucide-react';

interface WeatherData {
  current: {
    temp: number;
    humidity: number;
    description: string;
    minTemp: number;
    maxTemp: number;
  };
  forecast: Array<{
    date: string;
    dayName: string;
    maxTemp: number;
    minTemp: number;
    description: string;
  }>;
  city: string;
}

interface WeatherWidgetProps {
  currentTime?: Date;
  formatTime?: (date: Date, format: string) => string;
}

function getWeatherIcon(description: string, size: 'sm' | 'lg' = 'sm') {
  const desc = description.toLowerCase();
  const iconClass = size === 'lg' ? 'w-8 h-8' : 'w-4 h-4';
  
  if (desc.includes('sunny') || desc.includes('clear') || desc.includes('sol') || desc.includes('limpo')) 
    return <Sun className={`${iconClass} text-yellow-400 animate-[spin_8s_linear_infinite]`} />;
  if (desc.includes('partly') || desc.includes('parcialmente')) 
    return <CloudSun className={`${iconClass} text-yellow-300 animate-pulse`} />;
  if (desc.includes('rain') || desc.includes('shower') || desc.includes('chuva')) 
    return <CloudRain className={`${iconClass} text-blue-400 animate-bounce`} />;
  if (desc.includes('thunder') || desc.includes('storm') || desc.includes('trovoada')) 
    return <CloudLightning className={`${iconClass} text-purple-400 animate-[pulse_0.5s_ease-in-out_infinite]`} />;
  if (desc.includes('snow') || desc.includes('neve')) 
    return <CloudSnow className={`${iconClass} text-white animate-[bounce_2s_ease-in-out_infinite]`} />;
  if (desc.includes('fog') || desc.includes('mist') || desc.includes('neblina') || desc.includes('nevoeiro')) 
    return <Wind className={`${iconClass} text-slate-400 animate-pulse`} />;
  if (desc.includes('cloud') || desc.includes('nublado') || desc.includes('encoberto')) 
    return <Cloud className={`${iconClass} text-slate-300 animate-pulse`} />;
  
  return <CloudSun className={`${iconClass} text-yellow-300 animate-pulse`} />;
}

const ALL_CITIES = [
  'Paineiras', 'Biquinhas', 'Abaeté', 'Cedro do Abaeté', 'Morada Nova de Minas',
  'Quartel Geral', 'Tiros', 'Martinho Campos', 'Matutina', 'Dores do Indaiá',
  'Pompéu', 'Lagoa da Prata', 'São Gotardo', 'Felixlândia', 'Curvelo',
  'Três Marias', 'Piumhi', 'Formiga', 'Arcos', 'Pains', 'Pimenta',
  'Córrego Fundo', 'Bom Despacho', 'Santo Antônio do Monte', 'Luz', 'Oliveira',
  'Divinópolis', 'Iguatama', 'Japaraíba', 'Serra da Saudade', 'Lagoa Formosa'
];

const OTHER_CITIES = ALL_CITIES.filter(c => c !== 'Paineiras');

export function WeatherWidget({ currentTime, formatTime }: WeatherWidgetProps) {
  const [weatherCache, setWeatherCache] = useState<Record<string, WeatherData>>({});
  const [displayCity, setDisplayCity] = useState('Paineiras');
  const [showMaxTemp, setShowMaxTemp] = useState(true);
  const [rotationCount, setRotationCount] = useState(0);
  const [otherCityIndex, setOtherCityIndex] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const fetchingRef = useRef(false);

  // Get current weather from cache
  const currentWeather = weatherCache[displayCity];

  // Fetch weather for a single city
  const fetchCityWeather = useCallback(async (city: string): Promise<WeatherData | null> => {
    try {
      const cityForUrl = city.replace(/ /g, '+');
      const response = await fetch(
        `https://wttr.in/${cityForUrl},Minas+Gerais,Brazil?format=j1&lang=pt`
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      const current = data.current_condition[0];
      const todayForecast = data.weather[0];
      const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

      const forecast = data.weather.slice(0, 2).map((day: any, index: number) => {
        const date = new Date(day.date);
        return {
          date: day.date,
          dayName: index === 0 ? 'HOJE' : dayNames[date.getDay()].toUpperCase(),
          maxTemp: parseInt(day.maxtempC),
          minTemp: parseInt(day.mintempC),
          description: day.hourly[4]?.lang_pt?.[0]?.value || day.hourly[0]?.weatherDesc[0]?.value || '',
        };
      });

      return {
        current: {
          temp: parseInt(current.temp_C),
          humidity: parseInt(current.humidity),
          description: current.lang_pt?.[0]?.value || current.weatherDesc[0]?.value || '',
          minTemp: parseInt(todayForecast.mintempC),
          maxTemp: parseInt(todayForecast.maxtempC),
        },
        forecast,
        city,
      };
    } catch (err) {
      console.error(`Weather fetch error for ${city}:`, err);
      return null;
    }
  }, []);

  // Fetch all cities weather and update cache
  const fetchAllWeather = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    console.log('Fetching weather for all cities...');
    const newCache: Record<string, WeatherData> = {};

    // Fetch cities in batches to avoid rate limiting
    for (let i = 0; i < ALL_CITIES.length; i++) {
      const city = ALL_CITIES[i];
      const weather = await fetchCityWeather(city);
      if (weather) {
        newCache[city] = weather;
      }
      // Small delay between requests to avoid rate limiting
      if (i < ALL_CITIES.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (Object.keys(newCache).length > 0) {
      setWeatherCache(prev => ({ ...prev, ...newCache }));
      setInitialLoading(false);
    }

    fetchingRef.current = false;
    console.log('Weather cache updated for', Object.keys(newCache).length, 'cities');
  }, [fetchCityWeather]);

  // Initial fetch and 15-minute refresh
  useEffect(() => {
    fetchAllWeather();
    const interval = setInterval(fetchAllWeather, 15 * 60 * 1000); // 15 minutes
    return () => clearInterval(interval);
  }, [fetchAllWeather]);

  // Rotate display city every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRotationCount(prev => {
        const next = prev + 1;
        // Every 5th rotation shows Paineiras
        if (next % 5 === 0) {
          setDisplayCity('Paineiras');
        } else {
          setOtherCityIndex(prevIdx => {
            const nextIdx = (prevIdx + 1) % OTHER_CITIES.length;
            setDisplayCity(OTHER_CITIES[nextIdx]);
            return nextIdx;
          });
        }
        return next;
      });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Alternate between min and max temp every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setShowMaxTemp(prev => !prev);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Clock section component
  const ClockSection = () => {
    if (!currentTime || !formatTime) return null;
    
    return (
      <div className="flex items-center gap-2 ml-1">
        <div className="flex items-baseline whitespace-nowrap">
          <span className="text-xl font-mono font-black text-white tracking-tight">
            {formatTime(currentTime, 'HH:mm')}
          </span>
          <span className="text-sm font-mono font-bold text-yellow-400 animate-pulse">
            :{formatTime(currentTime, 'ss')}
          </span>
        </div>
        <div className="text-center">
          <p className="text-[9px] font-mono font-bold text-yellow-400 leading-tight whitespace-nowrap">
            {formatTime(currentTime, "EEE").toUpperCase()}
          </p>
          <p className="text-[9px] font-mono font-semibold text-cyan-400 leading-tight whitespace-nowrap">
            {formatTime(currentTime, "dd/MM")}
          </p>
        </div>
      </div>
    );
  };

  // Only show loading on initial load
  if (initialLoading && !currentWeather) {
    return (
      <div className="bg-red-800 backdrop-blur-md rounded-lg px-4 py-3 shadow-lg overflow-hidden">
        <div className="flex items-center gap-2">
          <Cloud className="w-5 h-5 text-white/70 animate-pulse" />
          <span className="text-white/80 text-xs">Carregando previsões...</span>
          <ClockSection />
        </div>
      </div>
    );
  }

  // If no cached data for current city, show last available or fallback
  const weather = currentWeather || weatherCache['Paineiras'] || Object.values(weatherCache)[0];

  if (!weather) {
    return (
      <div className="bg-red-800 backdrop-blur-md rounded-lg px-4 py-3 shadow-lg overflow-hidden">
        <div className="flex items-center gap-2">
          <Cloud className="w-5 h-5 text-white/50" />
          <span className="text-white/60 text-xs">Indisponível</span>
          <ClockSection />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-red-800 backdrop-blur-md rounded-lg px-4 py-3 shadow-lg overflow-hidden">
      <div className="flex items-center gap-4">
        {/* Current weather with city */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center text-white text-xs font-poppins font-semibold drop-shadow-[0_0_6px_rgba(255,255,255,0.5)] leading-tight text-center min-w-[120px]">
            <span>Previsão do tempo</span>
            <span className="flex items-center gap-0.5 animate-pulse text-yellow-400"><MapPin className="w-3 h-3" />{displayCity}-MG</span>
          </div>
          {getWeatherIcon(weather.current.description, 'lg')}
          <div className="flex items-baseline gap-1.5 transition-all duration-500">
            <span className={`text-[8px] font-bold ${showMaxTemp ? 'text-orange-300' : 'text-cyan-300'}`}>
              {showMaxTemp ? 'MAX' : 'MIN'}
            </span>
            <span className="text-white font-black text-2xl leading-none">
              {showMaxTemp ? weather.current.maxTemp : weather.current.minTemp}°<span className="text-yellow-400">c</span>
            </span>
          </div>
          <Droplets className="w-5 h-5 text-cyan-300 ml-2" />
          <span className="text-red-100 text-[10px]">{weather.current.humidity}%</span>
        </div>
        
        <div className="w-px h-8 bg-red-600/50" />
        
        {/* Forecast inline */}
        {weather.forecast.map((day, index) => (
          <div 
            key={index} 
            className="bg-red-700 rounded-md px-3 py-1.5 flex items-center gap-2"
          >
            {getWeatherIcon(day.description, 'sm')}
            <div className="text-[9px] leading-tight">
              <p className="text-white font-bold">{day.dayName}</p>
              <p className="text-red-100">{day.minTemp}°/{day.maxTemp}°</p>
            </div>
          </div>
        ))}
        
        {/* Clock after forecast */}
        <ClockSection />
      </div>
    </div>
  );
}
