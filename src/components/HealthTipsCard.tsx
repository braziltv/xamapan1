import { useState, useEffect } from 'react';
import { Heart, Droplets, Apple, Activity, Moon, Shield, Brain, Thermometer, Eye, Ear } from 'lucide-react';

interface HealthTip {
  icon: React.ReactNode;
  title: string;
  description: string;
  category: string;
  color: string;
}

const healthTips: HealthTip[] = [
  {
    icon: <Droplets className="w-full h-full" />,
    title: "Hidratação",
    description: "Beba pelo menos 2 litros de água por dia para manter seu corpo hidratado e saudável.",
    category: "Bem-estar",
    color: "from-cyan-500 to-blue-600"
  },
  {
    icon: <Apple className="w-full h-full" />,
    title: "Alimentação",
    description: "Inclua frutas e vegetais em todas as refeições para uma dieta equilibrada.",
    category: "Nutrição",
    color: "from-green-500 to-emerald-600"
  },
  {
    icon: <Activity className="w-full h-full" />,
    title: "Exercícios",
    description: "Pratique atividades físicas regularmente. 30 minutos por dia fazem diferença!",
    category: "Fitness",
    color: "from-orange-500 to-red-600"
  },
  {
    icon: <Moon className="w-full h-full" />,
    title: "Sono",
    description: "Durma de 7 a 9 horas por noite para recuperar corpo e mente.",
    category: "Descanso",
    color: "from-indigo-500 to-purple-600"
  },
  {
    icon: <Shield className="w-full h-full" />,
    title: "Vacinação",
    description: "Mantenha suas vacinas em dia. A prevenção é o melhor remédio!",
    category: "Prevenção",
    color: "from-teal-500 to-cyan-600"
  },
  {
    icon: <Heart className="w-full h-full" />,
    title: "Coração",
    description: "Controle a pressão arterial e colesterol. Seu coração agradece!",
    category: "Saúde Cardíaca",
    color: "from-red-500 to-pink-600"
  },
  {
    icon: <Brain className="w-full h-full" />,
    title: "Saúde Mental",
    description: "Cuide da sua mente. Pratique meditação e reserve tempo para você.",
    category: "Bem-estar",
    color: "from-violet-500 to-purple-600"
  },
  {
    icon: <Thermometer className="w-full h-full" />,
    title: "Febre",
    description: "Febre acima de 38°C requer atenção. Procure orientação médica.",
    category: "Alerta",
    color: "from-amber-500 to-orange-600"
  },
  {
    icon: <Eye className="w-full h-full" />,
    title: "Visão",
    description: "Faça pausas de 20 segundos a cada 20 minutos olhando para longe.",
    category: "Cuidados",
    color: "from-sky-500 to-blue-600"
  },
  {
    icon: <Ear className="w-full h-full" />,
    title: "Audição",
    description: "Evite volumes altos em fones de ouvido para proteger sua audição.",
    category: "Prevenção",
    color: "from-rose-500 to-red-600"
  },
  {
    icon: <Droplets className="w-full h-full" />,
    title: "Lave as Mãos",
    description: "Lave as mãos frequentemente com água e sabão por pelo menos 20 segundos.",
    category: "Higiene",
    color: "from-blue-500 to-indigo-600"
  },
  {
    icon: <Apple className="w-full h-full" />,
    title: "Fibras",
    description: "Consuma alimentos ricos em fibras para melhorar a digestão.",
    category: "Nutrição",
    color: "from-lime-500 to-green-600"
  }
];

export function HealthTipsCard() {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentTipIndex((prev) => (prev + 1) % healthTips.length);
        setIsTransitioning(false);
      }, 300);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  const currentTip = healthTips[currentTipIndex];

  return (
    <div className={`relative overflow-hidden rounded-xl sm:rounded-2xl transition-all duration-500 ${
      isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
    }`}>
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${currentTip.color} opacity-90`} />
      
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 backdrop-blur-sm bg-white/10" />
      
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-24 h-24 bg-white rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      
      {/* Content */}
      <div className="relative z-10 p-3 sm:p-4 lg:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Icon container */}
          <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shadow-lg">
            <div className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7">
              {currentTip.icon}
            </div>
          </div>
          
          {/* Text content */}
          <div className="flex-1 min-w-0">
            {/* Category badge */}
            <span className="inline-block px-2 py-0.5 text-[8px] sm:text-[9px] lg:text-[10px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-sm rounded-full text-white/90 mb-1">
              {currentTip.category}
            </span>
            
            {/* Title */}
            <h3 className="tv-font-heading font-bold text-white text-sm sm:text-base lg:text-lg leading-tight drop-shadow-md">
              {currentTip.title}
            </h3>
            
            {/* Description */}
            <p className="tv-font-body text-white/90 text-[10px] sm:text-xs lg:text-sm leading-relaxed mt-1 drop-shadow-sm">
              {currentTip.description}
            </p>
          </div>
        </div>
        
        {/* Progress indicator */}
        <div className="mt-3 flex items-center gap-1">
          {healthTips.map((_, index) => (
            <div
              key={index}
              className={`h-1 rounded-full transition-all duration-300 ${
                index === currentTipIndex 
                  ? 'w-4 sm:w-6 bg-white' 
                  : 'w-1 sm:w-1.5 bg-white/40'
              }`}
            />
          ))}
        </div>
      </div>
      
      {/* Decorative heart pulse */}
      <div className="absolute -bottom-2 -right-2 opacity-10">
        <Heart className="w-16 h-16 sm:w-20 sm:h-20 text-white animate-pulse" />
      </div>
    </div>
  );
}
