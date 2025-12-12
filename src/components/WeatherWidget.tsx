import { useEffect, useState } from 'react';
import { Cloud, Droplets, Sun, CloudRain, CloudSnow, CloudLightning, Wind, Thermometer } from 'lucide-react';

interface WeatherData {
  current: {
    temp: number;
    humidity: number;
    description: string;
  };
  forecast: Array<{
    date: string;
    dayName: string;
    maxTemp: number;
    minTemp: number;
    humidity: number;
    description: string;
  }>;
  city: string;
}

function getWeatherIcon(description: string, size: 'sm' | 'md' = 'md') {
  const desc = description.toLowerCase();
  const iconClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  
  if (desc.includes('sunny') || desc.includes('clear') || desc.includes('sol') || desc.includes('limpo')) 
    return <Sun className={`${iconClass} text-yellow-400`} />;
  if (desc.includes('rain') || desc.includes('shower') || desc.includes('chuva')) 
    return <CloudRain className={`${iconClass} text-blue-400`} />;
  if (desc.includes('thunder') || desc.includes('storm') || desc.includes('trovoada')) 
    return <CloudLightning className={`${iconClass} text-purple-400`} />;
  if (desc.includes('snow') || desc.includes('neve')) 
    return <CloudSnow className={`${iconClass} text-white`} />;
  if (desc.includes('fog') || desc.includes('mist') || desc.includes('neblina') || desc.includes('nevoeiro')) 
    return <Wind className={`${iconClass} text-slate-400`} />;
  
  return <Cloud className={`${iconClass} text-slate-300`} />;
}

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          'https://wttr.in/Paineiras,Minas+Gerais,Brazil?format=j1&lang=pt'
        );
        
        if (!response.ok) throw new Error('Failed to fetch weather');
        
        const data = await response.json();
        
        const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        
        const current = data.current_condition[0];
        const forecast = data.weather.slice(0, 5).map((day: any) => {
          const date = new Date(day.date);
          return {
            date: day.date,
            dayName: dayNames[date.getDay()],
            maxTemp: parseInt(day.maxtempC),
            minTemp: parseInt(day.mintempC),
            humidity: parseInt(day.hourly[4]?.humidity || day.hourly[0]?.humidity),
            description: day.hourly[4]?.lang_pt?.[0]?.value || day.hourly[0]?.weatherDesc[0]?.value || '',
          };
        });

        setWeather({
          current: {
            temp: parseInt(current.temp_C),
            humidity: parseInt(current.humidity),
            description: current.lang_pt?.[0]?.value || current.weatherDesc[0]?.value || '',
          },
          forecast,
          city: 'Paineiras-MG',
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
    const interval = setInterval(fetchWeather, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-sky-600/90 to-blue-700/90 rounded-xl px-4 py-2 border border-sky-500/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Cloud className="w-5 h-5 text-white animate-pulse" />
          <span className="text-white text-sm">Carregando...</span>
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="bg-gradient-to-r from-slate-600/90 to-slate-700/90 rounded-xl px-4 py-2 border border-slate-500/50">
        <div className="flex items-center gap-2">
          <Cloud className="w-5 h-5 text-slate-300" />
          <span className="text-slate-300 text-sm">{error || 'Indisponível'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-sky-600/90 to-blue-700/90 rounded-xl px-3 py-2 border border-sky-500/50 backdrop-blur-sm">
      <div className="flex items-center gap-3 md:gap-4">
        {/* Current Weather */}
        <div className="flex items-center gap-2 border-r border-sky-400/40 pr-3 md:pr-4">
          {getWeatherIcon(weather.current.description)}
          <div className="flex flex-col">
            <span className="text-white font-bold text-lg md:text-xl leading-none">
              {weather.current.temp}°C
            </span>
            <span className="text-sky-200 text-[10px] md:text-xs">{weather.city}</span>
          </div>
          <div className="flex items-center gap-1 text-sky-200 ml-1">
            <Droplets className="w-3.5 h-3.5" />
            <span className="text-xs md:text-sm font-medium">{weather.current.humidity}%</span>
          </div>
        </div>

        {/* 5 Day Forecast - Horizontal */}
        <div className="flex items-center gap-2 md:gap-3">
          {weather.forecast.map((day, index) => (
            <div 
              key={day.date} 
              className={`flex flex-col items-center px-2 py-1 rounded-lg ${
                index === 0 ? 'bg-sky-500/40' : 'bg-sky-900/30'
              }`}
            >
              <span className="text-white font-medium text-[10px] md:text-xs">
                {index === 0 ? 'Hoje' : day.dayName}
              </span>
              <div className="my-0.5">
                {getWeatherIcon(day.description, 'sm')}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-white text-xs font-bold">{day.maxTemp}°</span>
                <span className="text-sky-300 text-[10px]">{day.minTemp}°</span>
              </div>
              <div className="flex items-center gap-0.5 text-sky-200">
                <Droplets className="w-2.5 h-2.5" />
                <span className="text-[9px]">{day.humidity}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
