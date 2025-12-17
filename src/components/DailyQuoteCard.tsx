import { useMemo, useState, useEffect, useCallback } from 'react';
import { Lightbulb, Quote, Sparkles } from 'lucide-react';

const QUOTES = [
  {
    quote: "Só sei que nada sei.",
    author: "Sócrates (c. 399 a.C.)",
    insight: "Reconhecer sua própria ignorância é o primeiro passo para aprender.",
    bgColor: "from-emerald-500 via-emerald-600 to-teal-700",
    emoji: "🗣️"
  },
  {
    quote: "Somos aquilo que fazemos repetidamente.",
    author: "Aristóteles (c. 350 a.C.)",
    insight: "Bons hábitos diários constroem caráter e excelência.",
    bgColor: "from-blue-500 via-blue-600 to-indigo-700",
    emoji: "🔄"
  },
  {
    quote: "A felicidade depende de nós mesmos.",
    author: "Aristóteles (c. 350 a.C.)",
    insight: "Alegria vem das escolhas e atitudes, não do que acontece fora.",
    bgColor: "from-orange-400 via-orange-500 to-red-600",
    emoji: "😊"
  },
  {
    quote: "Aquele que tem um porquê enfrenta qualquer como.",
    author: "Friedrich Nietzsche (1888)",
    insight: "Ter um propósito dá força para superar qualquer dificuldade.",
    bgColor: "from-purple-500 via-purple-600 to-violet-700",
    emoji: "💪"
  },
  {
    quote: "Penso, logo existo.",
    author: "René Descartes (1637)",
    insight: "Pensar é a prova de nossa existência e consciência.",
    bgColor: "from-indigo-500 via-indigo-600 to-purple-700",
    emoji: "🧠"
  },
  {
    quote: "A imaginação é mais importante que o conhecimento.",
    author: "Albert Einstein (c. 1929)",
    insight: "Criar novas ideias é mais poderoso do que apenas acumular informações.",
    bgColor: "from-red-500 via-rose-500 to-pink-600",
    emoji: "✨"
  },
  {
    quote: "No meio da dificuldade encontra-se a oportunidade.",
    author: "Albert Einstein (c. 1940)",
    insight: "Problemas podem ser portas para aprendizado e crescimento.",
    bgColor: "from-violet-500 via-purple-600 to-indigo-700",
    emoji: "🚀"
  },
  {
    quote: "Insanidade é fazer sempre a mesma coisa e esperar resultados diferentes.",
    author: "Atribuída a Albert Einstein (séc. XX)",
    insight: "Para mudar o resultado, é preciso mudar a abordagem.",
    bgColor: "from-amber-400 via-orange-500 to-red-500",
    emoji: "🔀"
  },
  {
    quote: "Sempre parece impossível até que seja feito.",
    author: "Nelson Mandela (c. 2001)",
    insight: "Grandes conquistas parecem inalcançáveis antes de acontecerem.",
    bgColor: "from-teal-500 via-cyan-600 to-blue-700",
    emoji: "🏆"
  },
  {
    quote: "A pressa é inimiga da perfeição.",
    author: "Provérbio clássico",
    insight: "Qualidade exige tempo e atenção aos detalhes.",
    bgColor: "from-fuchsia-500 via-pink-600 to-rose-700",
    emoji: "⏳"
  },
  {
    quote: "Aquele que vence a si mesmo é o mais poderoso.",
    author: "Lao-Tsé (c. 600 a.C.)",
    insight: "O maior domínio é controlar seus próprios impulsos.",
    bgColor: "from-cyan-500 via-teal-600 to-emerald-700",
    emoji: "🎯"
  },
  {
    quote: "Quem não arrisca, não petisca.",
    author: "Provérbio popular",
    insight: "Sem coragem para tentar, não há recompensas.",
    bgColor: "from-rose-500 via-red-500 to-orange-600",
    emoji: "🎲"
  },
  {
    quote: "O futuro pertence àqueles que acreditam em seus sonhos.",
    author: "Eleanor Roosevelt (c. 1940)",
    insight: "Acreditar e agir transforma o futuro em realidade.",
    bgColor: "from-sky-500 via-blue-600 to-indigo-700",
    emoji: "🌟"
  },
  {
    quote: "Se você pode sonhar, você pode fazer.",
    author: "Walt Disney (c. 1950)",
    insight: "Todo grande feito começa com uma visão e vontade de realizá-la.",
    bgColor: "from-lime-500 via-green-600 to-emerald-700",
    emoji: "💭"
  },
  {
    quote: "A mente que se abre a uma nova ideia jamais volta ao seu tamanho original.",
    author: "Oliver Wendell Holmes (1858)",
    insight: "Aprender muda permanentemente a forma de pensar.",
    bgColor: "from-pink-500 via-fuchsia-600 to-purple-700",
    emoji: "📖"
  },
  {
    quote: "Não é o mais forte que sobrevive, mas o que melhor se adapta.",
    author: "Charles Darwin (1859)",
    insight: "Flexibilidade e adaptação garantem sobrevivência e sucesso.",
    bgColor: "from-yellow-400 via-amber-500 to-orange-600",
    emoji: "🦋"
  }
];

function getDailyQuoteIndex(): number {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  return seed % QUOTES.length;
}

const ANIMATION_CYCLE = 15000; // 15 seconds per cycle

export function DailyQuoteCard() {
  const [animationKey, setAnimationKey] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  const [showQuote, setShowQuote] = useState(false);
  const [showAuthor, setShowAuthor] = useState(false);
  const [showInsight, setShowInsight] = useState(false);

  const dailyQuote = useMemo(() => {
    const index = getDailyQuoteIndex();
    return QUOTES[index];
  }, []);

  const runAnimation = useCallback(() => {
    // Reset all states
    setIsVisible(false);
    setShowBadge(false);
    setShowQuote(false);
    setShowAuthor(false);
    setShowInsight(false);

    // Staggered animation sequence
    const timers = [
      setTimeout(() => setIsVisible(true), 100),
      setTimeout(() => setShowBadge(true), 500),
      setTimeout(() => setShowQuote(true), 900),
      setTimeout(() => setShowAuthor(true), 1300),
      setTimeout(() => setShowInsight(true), 1700),
    ];

    return timers;
  }, []);

  useEffect(() => {
    // Run initial animation
    let timers = runAnimation();

    // Set up repeating animation
    const interval = setInterval(() => {
      timers.forEach(clearTimeout);
      setAnimationKey(prev => prev + 1);
      timers = runAnimation();
    }, ANIMATION_CYCLE);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(interval);
    };
  }, [runAnimation]);

  return (
    <div 
      key={animationKey}
      className={`
        relative w-full overflow-hidden rounded-2xl 
        bg-gradient-to-r ${dailyQuote.bgColor} 
        p-5 sm:p-6 shadow-xl
        border border-white/20
        transition-all duration-1000 ease-out
        ${isVisible 
          ? 'opacity-100 translate-y-0 scale-100' 
          : 'opacity-0 translate-y-6 scale-98'
        }
      `}
    >
      {/* Animated gradient overlay */}
      <div 
        className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0"
        style={{
          backgroundSize: '200% 100%',
          animation: 'shimmer 4s ease-in-out infinite',
        }}
      />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full"
            style={{
              left: `${15 + i * 20}%`,
              animation: `float ${3 + i * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.3}s`,
              top: '80%',
            }}
          />
        ))}
      </div>

      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className={`
            absolute -top-10 -right-10 text-[120px] rotate-12
            transition-all duration-1200 delay-300
            ${isVisible ? 'text-white/10 translate-x-0 rotate-12' : 'text-white/0 translate-x-20 rotate-45'}
          `}
        >
          {dailyQuote.emoji}
        </div>
        <div 
          className={`
            absolute -bottom-8 -left-8 
            transition-all duration-1200 delay-500
            ${isVisible ? 'text-white/5 translate-y-0 rotate-0' : 'text-white/0 translate-y-10 -rotate-12'}
          `}
        >
          <Lightbulb className="w-32 h-32" />
        </div>
        <div 
          className={`
            absolute top-4 left-4 text-white/20
            transition-all duration-700 delay-200
            ${showBadge ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}
          `}
        >
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
        <div 
          className={`
            absolute bottom-4 right-4 text-white/20
            transition-all duration-700 delay-800
            ${showInsight ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}
          `}
        >
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {/* Badge */}
        <div 
          className={`
            inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 mb-4
            transition-all duration-700 ease-out
            ${showBadge 
              ? 'opacity-100 translate-x-0 scale-100' 
              : 'opacity-0 -translate-x-8 scale-90'
            }
          `}
        >
          <Sparkles 
            className={`w-3.5 h-3.5 text-yellow-300 transition-transform duration-1000 ${showBadge ? 'rotate-[360deg]' : 'rotate-0'}`} 
          />
          <span className="text-white text-xs font-semibold tracking-wide">FRASE DO DIA</span>
        </div>

        {/* Quote */}
        <div 
          className={`
            flex items-start gap-2 mb-3
            transition-all duration-800 ease-out
            ${showQuote 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-6'
            }
          `}
        >
          <Quote 
            className={`
              w-6 h-6 text-white/60 flex-shrink-0 mt-1
              transition-all duration-700
              ${showQuote ? 'rotate-0 scale-100' : '-rotate-45 scale-0'}
            `} 
          />
          <p className="text-white font-bold text-lg sm:text-xl leading-snug drop-shadow-md">
            {dailyQuote.quote}
          </p>
        </div>
        
        {/* Author */}
        <p 
          className={`
            text-white/90 text-sm font-medium mb-4 pl-8
            transition-all duration-700 ease-out
            ${showAuthor 
              ? 'opacity-100 translate-x-0' 
              : 'opacity-0 translate-x-8'
            }
          `}
        >
          — {dailyQuote.author}
        </p>
        
        {/* Insight Box */}
        <div 
          className={`
            flex items-center gap-3 bg-black/20 backdrop-blur-sm rounded-xl px-4 py-3
            transition-all duration-900 ease-out
            ${showInsight 
              ? 'opacity-100 translate-y-0 scale-100' 
              : 'opacity-0 translate-y-8 scale-95'
            }
          `}
        >
          <div 
            className={`
              flex-shrink-0 w-10 h-10 bg-yellow-400/90 rounded-full flex items-center justify-center shadow-lg
              transition-all duration-700 delay-100
              ${showInsight ? 'scale-100 rotate-0' : 'scale-0 -rotate-180'}
            `}
          >
            <Lightbulb className="w-5 h-5 text-yellow-900" />
          </div>
          <div>
            <p className="text-yellow-300 text-xs font-semibold uppercase tracking-wider mb-0.5">Insight</p>
            <p className="text-white text-sm leading-tight">
              {dailyQuote.insight}
            </p>
          </div>
        </div>
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes float {
          0%, 100% { 
            transform: translateY(0) scale(1); 
            opacity: 0.2;
          }
          50% { 
            transform: translateY(-100px) scale(1.5); 
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
}
