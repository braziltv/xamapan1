import { useEffect, useState } from 'react';
import { Cloud, Droplets, Sun, CloudRain, CloudSnow, CloudLightning, Wind } from 'lucide-react';

interface WeatherData {
  current: {
    temp: number;
    humidity: number;
    description: string;
    icon: string;
  };
  forecast: Array<{
    date: string;
    dayName: string;
    maxTemp: number;
    minTemp: number;
    humidity: number;
    description: string;
    icon: string;
  }>;
  city: string;
}

const weatherIcons: Record<string, React.ReactNode> = {
  sunny: <Sun className="w-8 h-8 md:w-12 md:h-12 text-yellow-400" />,
  clear: <Sun className="w-8 h-8 md:w-12 md:h-12 text-yellow-400" />,
  cloudy: <Cloud className="w-8 h-8 md:w-12 md:h-12 text-slate-300" />,
  partly: <Cloud className="w-8 h-8 md:w-12 md:h-12 text-slate-300" />,
  rain: <CloudRain className="w-8 h-8 md:w-12 md:h-12 text-blue-400" />,
  shower: <CloudRain className="w-8 h-8 md:w-12 md:h-12 text-blue-400" />,
  thunder: <CloudLightning className="w-8 h-8 md:w-12 md:h-12 text-purple-400" />,
  snow: <CloudSnow className="w-8 h-8 md:w-12 md:h-12 text-white" />,
  fog: <Wind className="w-8 h-8 md:w-12 md:h-12 text-slate-400" />,
  mist: <Wind className="w-8 h-8 md:w-12 md:h-12 text-slate-400" />,
};

function getWeatherIcon(description: string) {
  const desc = description.toLowerCase();
  for (const [key, icon] of Object.entries(weatherIcons)) {
    if (desc.includes(key)) return icon;
  }
  return <Cloud className="w-8 h-8 md:w-12 md:h-12 text-slate-300" />;
}

function getSmallWeatherIcon(description: string) {
  const desc = description.toLowerCase();
  const iconClass = "w-5 h-5 md:w-6 md:h-6";
  
  if (desc.includes('sunny') || desc.includes('clear')) 
    return <Sun className={`${iconClass} text-yellow-400`} />;
  if (desc.includes('rain') || desc.includes('shower')) 
    return <CloudRain className={`${iconClass} text-blue-400`} />;
  if (desc.includes('thunder')) 
    return <CloudLightning className={`${iconClass} text-purple-400`} />;
  if (desc.includes('snow')) 
    return <CloudSnow className={`${iconClass} text-white`} />;
  if (desc.includes('fog') || desc.includes('mist')) 
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
        // Using wttr.in API for Paineiras, MG, Brazil
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
            icon: day.hourly[4]?.weatherDesc[0]?.value || '',
          };
        });

        setWeather({
          current: {
            temp: parseInt(current.temp_C),
            humidity: parseInt(current.humidity),
            description: current.lang_pt?.[0]?.value || current.weatherDesc[0]?.value || '',
            icon: current.weatherDesc[0]?.value || '',
          },
          forecast,
          city: 'Paineiras - MG',
        });
        setError(null);
      } catch (err) {
        console.error('Weather fetch error:', err);
        setError('Erro ao carregar previsão');
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
    // Update every 24 hours
    const interval = setInterval(fetchWeather, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-sky-600/80 to-blue-700/80 rounded-xl md:rounded-2xl p-3 md:p-4 border border-sky-500/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Cloud className="w-6 h-6 md:w-8 md:h-8 text-white animate-pulse" />
          <span className="text-white text-sm md:text-base">Carregando previsão...</span>
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="bg-gradient-to-br from-slate-600/80 to-slate-700/80 rounded-xl md:rounded-2xl p-3 md:p-4 border border-slate-500/50">
        <div className="flex items-center gap-2">
          <Cloud className="w-6 h-6 md:w-8 md:h-8 text-slate-300" />
          <span className="text-slate-300 text-sm md:text-base">{error || 'Indisponível'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-sky-600/80 to-blue-700/80 rounded-xl md:rounded-2xl p-3 md:p-5 border border-sky-500/50 backdrop-blur-sm">
      {/* Current Weather */}
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <div className="flex items-center gap-3 md:gap-4">
          {getWeatherIcon(weather.current.description)}
          <div>
            <p className="text-3xl md:text-5xl font-bold text-white">
              {weather.current.temp}°C
            </p>
            <p className="text-xs md:text-sm text-sky-200 capitalize">
              {weather.current.description}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-white font-semibold text-sm md:text-lg">{weather.city}</p>
          <div className="flex items-center gap-1 text-sky-200 text-xs md:text-sm">
            <Droplets className="w-3 h-3 md:w-4 md:h-4" />
            <span>{weather.current.humidity}%</span>
          </div>
        </div>
      </div>

      {/* 5 Day Forecast */}
      <div className="border-t border-sky-400/30 pt-3 md:pt-4">
        <p className="text-sky-200 text-xs md:text-sm mb-2 md:mb-3 font-medium">Próximos 5 dias</p>
        <div className="grid grid-cols-5 gap-1 md:gap-2">
          {weather.forecast.map((day, index) => (
            <div 
              key={day.date} 
              className={`text-center p-1 md:p-2 rounded-lg ${
                index === 0 ? 'bg-sky-500/30' : 'bg-sky-900/30'
              }`}
            >
              <p className="text-white font-semibold text-xs md:text-sm">
                {index === 0 ? 'Hoje' : day.dayName}
              </p>
              <div className="flex justify-center my-1">
                {getSmallWeatherIcon(day.description)}
              </div>
              <p className="text-white text-xs md:text-sm font-bold">{day.maxTemp}°</p>
              <p className="text-sky-300 text-[10px] md:text-xs">{day.minTemp}°</p>
              <div className="flex items-center justify-center gap-0.5 text-sky-200 text-[10px] md:text-xs mt-1">
                <Droplets className="w-2 h-2 md:w-3 md:h-3" />
                <span>{day.humidity}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
