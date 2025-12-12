import { useEffect, useState } from 'react';
import { Cloud, Droplets, Sun, CloudRain, CloudSnow, CloudLightning, Wind } from 'lucide-react';

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
  const iconClass = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6 md:w-8 md:h-8';
  
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
      <div className="bg-gradient-to-br from-sky-600/80 to-blue-700/80 rounded-lg md:rounded-xl p-2 md:p-3 border border-sky-500/50 backdrop-blur-sm min-w-[140px]">
        <div className="flex items-center gap-2">
          <Cloud className="w-5 h-5 text-white animate-pulse" />
          <span className="text-white text-xs">Carregando...</span>
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="bg-gradient-to-br from-slate-600/80 to-slate-700/80 rounded-lg md:rounded-xl p-2 md:p-3 border border-slate-500/50 min-w-[140px]">
        <div className="flex items-center gap-2">
          <Cloud className="w-5 h-5 text-slate-300" />
          <span className="text-slate-300 text-xs">{error || 'Indisponível'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-sky-600/80 to-blue-700/80 rounded-lg md:rounded-xl p-2 md:p-3 border border-sky-500/50 backdrop-blur-sm">
      {/* Current Weather - Compact */}
      <div className="flex items-center gap-2 md:gap-3 mb-2">
        {getWeatherIcon(weather.current.description)}
        <div>
          <p className="text-xl md:text-2xl font-bold text-white leading-none">
            {weather.current.temp}°C
          </p>
          <p className="text-[10px] md:text-xs text-sky-200 capitalize truncate max-w-[80px]">
            {weather.current.description}
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-white font-medium text-[10px] md:text-xs">{weather.city}</p>
          <div className="flex items-center gap-1 text-sky-200 text-[10px]">
            <Droplets className="w-3 h-3" />
            <span>{weather.current.humidity}%</span>
          </div>
        </div>
      </div>

      {/* 5 Day Forecast - Compact */}
      <div className="border-t border-sky-400/30 pt-2">
        <div className="grid grid-cols-5 gap-1">
          {weather.forecast.map((day, index) => (
            <div 
              key={day.date} 
              className={`text-center p-1 rounded ${
                index === 0 ? 'bg-sky-500/30' : 'bg-sky-900/20'
              }`}
            >
              <p className="text-white font-medium text-[9px] md:text-[10px]">
                {index === 0 ? 'Hoje' : day.dayName}
              </p>
              <div className="flex justify-center my-0.5">
                {getWeatherIcon(day.description, 'sm')}
              </div>
              <p className="text-white text-[10px] md:text-xs font-bold">{day.maxTemp}°</p>
              <p className="text-sky-300 text-[9px]">{day.minTemp}°</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
