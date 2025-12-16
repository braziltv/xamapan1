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

function getWeatherIcon(description: string, size: 'sm' | 'md' | 'lg' = 'md') {
  const desc = description.toLowerCase();
  const iconClass = size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6';
  
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
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

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
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

        // Get 3 days forecast
        const forecast = data.weather.slice(0, 3).map((day: any, index: number) => {
          const date = new Date(day.date);
          return {
            date: day.date,
            dayName: index === 0 ? 'Hoje' : index === 1 ? 'Amanhã' : days[date.getDay()],
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
          city: 'Paineiras',
        });
        setLastUpdate(new Date());
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

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/20 shadow-lg min-w-[420px]">
        <div className="flex items-center justify-center gap-3">
          <Cloud className="w-6 h-6 text-white/70 animate-pulse" />
          <span className="text-white/80 text-sm font-medium">Carregando previsão...</span>
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="flex flex-col items-center gap-1">
        <span className="text-white/60 text-[10px] font-medium uppercase tracking-wider">Previsão do tempo</span>
        <div className="bg-white/10 backdrop-blur-md rounded-xl px-8 py-4 border border-white/20 shadow-lg min-w-[420px]">
          <div className="flex items-center justify-center gap-3">
            <Cloud className="w-6 h-6 text-white/50" />
            <span className="text-white/60 text-sm font-medium">{error || 'Indisponível'}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-white/60 text-[10px] font-medium uppercase tracking-wider">Previsão do tempo</span>
      <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-3 border border-white/20 shadow-lg min-w-[420px]">
        <div className="flex flex-col gap-3">
          {/* Top row: Current weather with larger display */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getWeatherIcon(weather.current.description, 'lg')}
              <div className="flex flex-col">
                <span className="text-white font-bold text-2xl leading-none">
                  {weather.current.temp}°C
                </span>
                <span className="text-white/60 text-xs capitalize">{weather.current.description}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Droplets className="w-5 h-5 text-cyan-300" />
                <span className="text-white font-medium text-sm">{weather.current.humidity}%</span>
              </div>
              <div className="text-right">
                <span className="text-white/90 text-sm font-semibold block">Paineiras</span>
                <span className="text-white/50 text-[10px]">MG</span>
              </div>
            </div>
          </div>

          {/* Bottom row: 3-day forecast */}
          <div className="flex items-center justify-between border-t border-white/10 pt-3">
            {weather.forecast.map((day, index) => (
              <div key={index} className="flex flex-col items-center gap-1 flex-1">
                <span className="text-white/70 text-xs font-medium">{day.dayName}</span>
                {getWeatherIcon(day.description, 'sm')}
                <div className="flex items-center gap-1">
                  <span className="text-white text-sm font-bold">{day.maxTemp}°</span>
                  <span className="text-white/50 text-xs">{day.minTemp}°</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
