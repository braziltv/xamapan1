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
        
        const current = data.current_condition[0];
        const todayForecast = data.weather[0];

        setWeather({
          current: {
            temp: parseInt(current.temp_C),
            humidity: parseInt(current.humidity),
            description: current.lang_pt?.[0]?.value || current.weatherDesc[0]?.value || '',
          },
          forecast: [{
            date: todayForecast.date,
            dayName: 'Hoje',
            maxTemp: parseInt(todayForecast.maxtempC),
            minTemp: parseInt(todayForecast.mintempC),
            humidity: parseInt(todayForecast.hourly[4]?.humidity || todayForecast.hourly[0]?.humidity),
            description: todayForecast.hourly[4]?.lang_pt?.[0]?.value || todayForecast.hourly[0]?.weatherDesc[0]?.value || '',
          }],
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
      <div className="bg-white/10 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/20 shadow-lg">
        <div className="flex items-center gap-3">
          <Cloud className="w-6 h-6 text-white/70 animate-pulse" />
          <span className="text-white/80 text-sm font-medium">Carregando...</span>
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/20 shadow-lg">
        <div className="flex items-center gap-3">
          <Cloud className="w-6 h-6 text-white/50" />
          <span className="text-white/60 text-sm">{error || 'Indisponível'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl px-3 py-2 border border-white/20 shadow-lg">
      <div className="flex items-center gap-3">
        {/* Weather Icon */}
        {getWeatherIcon(weather.current.description, 'sm')}
        
        {/* Temperature */}
        <span className="text-white font-bold text-lg leading-none">
          {weather.current.temp}°C
        </span>

        {/* Divider */}
        <div className="w-px h-5 bg-white/20" />

        {/* Humidity */}
        <div className="flex items-center gap-1">
          <Droplets className="w-4 h-4 text-cyan-300" />
          <span className="text-white font-medium text-sm">{weather.current.humidity}%</span>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-white/20" />

        {/* City */}
        <span className="text-white/80 text-xs font-medium">Paineiras-MG</span>
      </div>
    </div>
  );
}
