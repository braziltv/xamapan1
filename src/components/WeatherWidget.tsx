import { useEffect, useState } from 'react';
import { Cloud, Droplets, Sun, CloudRain, CloudSnow, CloudLightning, Wind, CloudSun } from 'lucide-react';

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

export function WeatherWidget({ currentTime, formatTime }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMaxTemp, setShowMaxTemp] = useState(true);

  // Alternate between min and max temp every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setShowMaxTemp(prev => !prev);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          'https://wttr.in/Paineiras,Minas+Gerais,Brazil?format=j1&lang=pt'
        );
        
        if (!response.ok) throw new Error('Failed to fetch weather');
        
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

        setWeather({
          current: {
            temp: parseInt(current.temp_C),
            humidity: parseInt(current.humidity),
            description: current.lang_pt?.[0]?.value || current.weatherDesc[0]?.value || '',
            minTemp: parseInt(todayForecast.mintempC),
            maxTemp: parseInt(todayForecast.maxtempC),
          },
          forecast,
          city: 'Paineiras',
        });
        setError(null);
      } catch (err) {
        console.error('Weather fetch error:', err);
        setError('Indisponível');
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
    // Update every 1 hour
    const interval = setInterval(fetchWeather, 60 * 60 * 1000);
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

  if (loading) {
    return (
      <div className="bg-red-800 backdrop-blur-md rounded-lg px-4 py-3 shadow-lg overflow-hidden">
        <div className="flex items-center gap-2">
          <Cloud className="w-5 h-5 text-white/70 animate-pulse" />
          <span className="text-white/80 text-xs">Carregando...</span>
          <ClockSection />
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="bg-red-800 backdrop-blur-md rounded-lg px-4 py-3 shadow-lg overflow-hidden">
        <div className="flex items-center gap-2">
          <Cloud className="w-5 h-5 text-white/50" />
          <span className="text-white/60 text-xs">{error || 'Indisponível'}</span>
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
          <span className="text-red-200 text-[10px] font-semibold uppercase">{weather.city}</span>
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
