import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Lightbulb, 
  Quote, 
  Sparkles, 
  X, 
  ChevronRight,
  HelpCircle,
  ClipboardList,
  Stethoscope,
  Volume2,
  VolumeX,
  ArrowRightCircle,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  Wrench,
  Mail,
  Phone
} from 'lucide-react';

// ==================== FRASES DO DIA ====================
const QUOTES = [
  {
    quote: "A alma é tingida com a cor de seus pensamentos.",
    author: "Marco Aurélio",
    insight: "A qualidade da nossa vida interna define como percebemos o mundo externo.",
    bgColor: "from-emerald-500 via-emerald-600 to-teal-700",
    emoji: "🎨"
  },
  {
    quote: "No meio da dificuldade reside a oportunidade.",
    author: "Albert Einstein",
    insight: "Crises não são apenas obstáculos, são o solo onde nascem as novas soluções.",
    bgColor: "from-blue-500 via-blue-600 to-indigo-700",
    emoji: "🚀"
  },
  {
    quote: "O sucesso é ir de fracasso em fracasso sem perder o entusiasmo.",
    author: "Winston Churchill",
    insight: "A vitória não é a ausência de quedas, mas a persistência do espírito.",
    bgColor: "from-orange-400 via-orange-500 to-red-600",
    emoji: "💪"
  },
  {
    quote: "Nós nos tornamos aquilo que pensamos.",
    author: "Earl Nightingale",
    insight: "Nossa mente é um jardim; o que plantamos hoje colheremos como realidade amanhã.",
    bgColor: "from-purple-500 via-purple-600 to-violet-700",
    emoji: "🧠"
  },
  {
    quote: "A sua vida é 10% do que acontece e 90% de como você reage.",
    author: "Charles Swindoll",
    insight: "Não controlamos os ventos, mas temos total poder sobre como ajustamos as velas.",
    bgColor: "from-indigo-500 via-indigo-600 to-purple-700",
    emoji: "⛵"
  },
  {
    quote: "A jornada de mil milhas começa com um único passo.",
    author: "Lao Tzu",
    insight: "O progresso real não exige saltos gigantes, apenas a coragem de começar agora.",
    bgColor: "from-red-500 via-rose-500 to-pink-600",
    emoji: "👣"
  },
  {
    quote: "A confiança em si mesmo é o primeiro segredo do sucesso.",
    author: "Ralph Waldo Emerson",
    insight: "Antes que o mundo acredite em você, você precisa ser o seu próprio maior aliado.",
    bgColor: "from-violet-500 via-purple-600 to-indigo-700",
    emoji: "🌟"
  },
  {
    quote: "A felicidade não é algo pronto. Ela vem das suas próprias ações.",
    author: "Dalai Lama",
    insight: "O bem-estar é um subproduto do nosso comportamento e não um presente do acaso.",
    bgColor: "from-emerald-500 via-teal-600 to-cyan-700",
    emoji: "😊"
  },
  {
    quote: "Onde quer que você vá, vá com todo o seu coração.",
    author: "Confúcio",
    insight: "A entrega total transforma tarefas comuns em obras extraordinárias.",
    bgColor: "from-red-500 via-rose-600 to-pink-700",
    emoji: "❤️"
  },
  {
    quote: "A persistência é o caminho do êxito.",
    author: "Charles Chaplin",
    insight: "O sucesso não é um evento isolado, mas o resultado de continuar tentando.",
    bgColor: "from-purple-500 via-violet-600 to-indigo-700",
    emoji: "🏆"
  },
  {
    quote: "Se você pode sonhar, você pode realizar.",
    author: "Walt Disney",
    insight: "A imaginação é o rascunho de uma realidade que a determinação pode construir.",
    bgColor: "from-violet-500 via-purple-600 to-pink-700",
    emoji: "🏰"
  },
  {
    quote: "A sorte é o que acontece quando a preparação encontra a oportunidade.",
    author: "Sêneca",
    insight: "O sucesso não é aleatório, é o resultado de estar pronto para o momento certo.",
    bgColor: "from-amber-500 via-orange-600 to-red-700",
    emoji: "🎲"
  }
];

// ==================== DICAS DE USO DO PROGRAMA ====================
interface UsageTip {
  title: string;
  tip: string;
  detail: string;
  icon: React.ReactNode;
  bgColor: string;
  emoji: string;
}

const USAGE_TIPS: UsageTip[] = [
  {
    title: "Cadastro de Pacientes",
    tip: "Ao salvar, o paciente vai direto para a Triagem",
    detail: "Não é necessário encaminhar nesta etapa. O sistema faz isso automaticamente!",
    icon: <ClipboardList className="w-4 h-4" />,
    bgColor: "from-sky-500 via-blue-600 to-indigo-700",
    emoji: "📋"
  },
  {
    title: "Triagem",
    tip: "Liste pacientes aguardando avaliação na fila",
    detail: "Realize a triagem completa antes de encaminhar para o próximo setor.",
    icon: <Stethoscope className="w-4 h-4" />,
    bgColor: "from-teal-500 via-cyan-600 to-blue-700",
    emoji: "🩺"
  },
  {
    title: "Chamada com Voz",
    tip: "Exibe o nome na TV e faz anúncio por voz",
    detail: "Use para chamadas públicas. O paciente verá seu nome no painel da TV.",
    icon: <Volume2 className="w-4 h-4" />,
    bgColor: "from-green-500 via-emerald-600 to-teal-700",
    emoji: "🔊"
  },
  {
    title: "Chamada Sem Voz",
    tip: "Chamada interna que não aparece na TV",
    detail: "Ideal para direcionamentos internos discretos entre setores.",
    icon: <VolumeX className="w-4 h-4" />,
    bgColor: "from-slate-500 via-gray-600 to-zinc-700",
    emoji: "🔕"
  },
  {
    title: "Encaminhar Paciente",
    tip: "Envie o paciente para o próximo setor",
    detail: "Use 'Encaminhar' para direcionamento público ou 'Sem voz' para interno.",
    icon: <ArrowRightCircle className="w-4 h-4" />,
    bgColor: "from-orange-500 via-amber-600 to-yellow-700",
    emoji: "🔀"
  },
  {
    title: "Finalizar Atendimento",
    tip: "Remove o paciente da fila",
    detail: "Finalize apenas quando o atendimento estiver completamente concluído.",
    icon: <CheckCircle className="w-4 h-4" />,
    bgColor: "from-green-600 via-emerald-700 to-teal-800",
    emoji: "✅"
  },
  {
    title: "Atualização Automática",
    tip: "As filas são atualizadas automaticamente",
    detail: "Não é necessário atualizar a página. As mudanças aparecem em tempo real!",
    icon: <RefreshCw className="w-4 h-4" />,
    bgColor: "from-cyan-500 via-teal-600 to-emerald-700",
    emoji: "🔄"
  },
  {
    title: "Regra de Fila Única",
    tip: "Paciente pode estar em apenas uma fila por vez",
    detail: "Ao encaminhar, o paciente sai da fila atual e entra na nova automaticamente.",
    icon: <AlertCircle className="w-4 h-4" />,
    bgColor: "from-rose-500 via-red-600 to-orange-700",
    emoji: "⛔"
  }
];

// ==================== SUPORTE ====================
const SUPPORT_INFO = {
  title: "Suporte do Sistema",
  message: "Caso identifique algum erro ou tenha dúvidas, críticas ou sugestões, entre em contato:",
  email: "kalebelg@gmail.com",
  phone: "(37) 99844-4433",
  bgColor: "from-slate-600 via-slate-700 to-zinc-800",
  emoji: "🛠️"
};

// ==================== TIPOS ====================
type ContentType = 'quote' | 'tip' | 'support';

interface ContentItem {
  type: ContentType;
  index: number;
}

// ==================== CONSTANTES ====================
const STORAGE_KEY = 'rotatingTips_dismissState';
const DISMISS_DELAY = 60 * 60 * 1000; // 1 hour
const ROTATION_INTERVAL = 3 * 60 * 1000; // 3 minutes
const SUPPORT_INTERVAL = 10 * 60 * 1000; // 10 minutes for support card

interface DismissState {
  dismissCount: number;
  lastDismissTime: number;
}

function getRandomIndex(max: number, excludeIndex?: number): number {
  let index = Math.floor(Math.random() * max);
  if (excludeIndex !== undefined && max > 1) {
    while (index === excludeIndex) {
      index = Math.floor(Math.random() * max);
    }
  }
  return index;
}

export function RotatingTipsCard() {
  const [isHidden, setIsHidden] = useState(true);
  const [currentContent, setCurrentContent] = useState<ContentItem>({ type: 'quote', index: 0 });
  const [animationKey, setAnimationKey] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [showSubContent, setShowSubContent] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const rotationCountRef = useRef(0);

  const currentData = useMemo(() => {
    if (currentContent.type === 'quote') {
      const quote = QUOTES[currentContent.index];
      return {
        type: 'quote' as const,
        badge: 'FRASE DO DIA',
        badgeIcon: <Sparkles className="w-3 h-3 text-yellow-300" />,
        mainText: quote.quote,
        subText: `— ${quote.author}`,
        detailTitle: 'Insight',
        detailText: quote.insight,
        detailIcon: <Lightbulb className="w-3.5 h-3.5 text-yellow-900" />,
        bgColor: quote.bgColor,
        emoji: quote.emoji,
        mainIcon: <Quote className="w-4 h-4 text-white/60" />
      };
    } else if (currentContent.type === 'tip') {
      const tip = USAGE_TIPS[currentContent.index];
      return {
        type: 'tip' as const,
        badge: 'DICA DE USO',
        badgeIcon: <HelpCircle className="w-3 h-3 text-blue-200" />,
        mainText: tip.tip,
        subText: tip.title,
        detailTitle: 'Saiba mais',
        detailText: tip.detail,
        detailIcon: tip.icon,
        bgColor: tip.bgColor,
        emoji: tip.emoji,
        mainIcon: tip.icon
      };
    } else {
      // Support card
      return {
        type: 'support' as const,
        badge: 'SUPORTE DO SISTEMA',
        badgeIcon: <Wrench className="w-3 h-3 text-orange-300" />,
        mainText: SUPPORT_INFO.message,
        subText: '',
        detailTitle: 'Contato',
        detailText: '',
        detailIcon: <Wrench className="w-3.5 h-3.5 text-orange-900" />,
        bgColor: SUPPORT_INFO.bgColor,
        emoji: SUPPORT_INFO.emoji,
        mainIcon: <Wrench className="w-4 h-4 text-white/60" />
      };
    }
  }, [currentContent]);

  // Check visibility based on dismiss state
  useEffect(() => {
    const checkVisibility = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
          setIsHidden(false);
          return;
        }

        const state: DismissState = JSON.parse(stored);
        const now = Date.now();
        const elapsed = now - state.lastDismissTime;

        if (elapsed >= DISMISS_DELAY) {
          localStorage.removeItem(STORAGE_KEY);
          setIsHidden(false);
        } else {
          setIsHidden(true);
        }
      } catch {
        setIsHidden(false);
      }
    };

    checkVisibility();
    const interval = setInterval(checkVisibility, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = useCallback(() => {
    setIsClosing(true);
    
    setTimeout(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const now = Date.now();
        
        const newState: DismissState = {
          dismissCount: stored ? JSON.parse(stored).dismissCount + 1 : 1,
          lastDismissTime: now,
        };
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
        setIsHidden(true);
        setIsClosing(false);
      } catch {
        setIsHidden(true);
        setIsClosing(false);
      }
    }, 400);
  }, []);

  const runAnimation = useCallback(() => {
    setIsVisible(true);
    setShowBadge(false);
    setShowContent(false);
    setShowSubContent(false);
    setShowDetail(false);

    const timers = [
      setTimeout(() => setShowBadge(true), 300),
      setTimeout(() => setShowContent(true), 600),
      setTimeout(() => setShowSubContent(true), 900),
      setTimeout(() => setShowDetail(true), 1200),
    ];

    return timers;
  }, []);

  // Smooth crossfade transition to next content
  const transitionToNext = useCallback(() => {
    setIsTransitioning(true);
    
    // Fade out current content
    setShowDetail(false);
    setTimeout(() => setShowSubContent(false), 100);
    setTimeout(() => setShowContent(false), 200);
    setTimeout(() => setShowBadge(false), 300);
    
    // Change content and fade in
    setTimeout(() => {
      rotationCountRef.current += 1;
      
      setCurrentContent(prev => {
        // Every ~3 rotations (10 min / 3 min = ~3.33), show support card
        // Show support after every 3 regular rotations
        if (rotationCountRef.current % 4 === 0) {
          return { type: 'support', index: 0 };
        }
        
        // Alternate between quote and tip
        if (prev.type === 'quote') {
          return {
            type: 'tip',
            index: getRandomIndex(USAGE_TIPS.length)
          };
        } else if (prev.type === 'tip') {
          return {
            type: 'quote',
            index: getRandomIndex(QUOTES.length)
          };
        } else {
          // After support, go back to quote
          return {
            type: 'quote',
            index: getRandomIndex(QUOTES.length)
          };
        }
      });
      setAnimationKey(prev => prev + 1);
      setIsTransitioning(false);
      
      // Fade in new content
      setTimeout(() => setShowBadge(true), 200);
      setTimeout(() => setShowContent(true), 500);
      setTimeout(() => setShowSubContent(true), 800);
      setTimeout(() => setShowDetail(true), 1100);
    }, 600);
  }, []);

  useEffect(() => {
    if (isHidden) return;

    const timers = runAnimation();

    const interval = setInterval(() => {
      transitionToNext();
    }, ROTATION_INTERVAL);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(interval);
    };
  }, [runAnimation, isHidden, transitionToNext]);

  if (isHidden) return null;

  return (
    <div 
      key={animationKey}
      className={`
        relative w-full overflow-hidden rounded-xl 
        bg-gradient-to-r ${currentData.bgColor} 
        p-3 sm:p-4 shadow-lg
        border border-white/20
        transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]
        ${isClosing 
          ? 'opacity-0 scale-95 translate-y-4' 
          : isVisible 
            ? 'opacity-100 translate-y-0 scale-100' 
            : 'opacity-0 translate-y-6 scale-98'
        }
        ${isTransitioning ? 'bg-opacity-95' : 'bg-opacity-100'}
      `}
    >
      {/* Action Buttons */}
      <div className="absolute top-2 right-2 z-20 flex gap-1.5">
        <button
          onClick={transitionToNext}
          disabled={isTransitioning}
          className="p-1.5 rounded-full 
            bg-white/30 hover:bg-white/50 backdrop-blur-sm
            text-white hover:text-white shadow-md
            transition-all duration-200 hover:scale-110
            border border-white/40
            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          title="Próximo"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        
        <button
          onClick={handleDismiss}
          className="p-1.5 rounded-full 
            bg-white/30 hover:bg-white/50 backdrop-blur-sm
            text-white hover:text-white shadow-md
            transition-all duration-200 hover:scale-110
            border border-white/40"
          title="Fechar (volta em 1 hora)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

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
            absolute -top-6 -right-6 text-[80px] rotate-12
            transition-all duration-1000 delay-300
            ${isVisible ? 'text-white/10 translate-x-0 rotate-12' : 'text-white/0 translate-x-20 rotate-45'}
          `}
        >
          {currentData.emoji}
        </div>
        <div 
          className={`
            absolute -bottom-6 -left-6 
            transition-all duration-1000 delay-500
            ${isVisible ? 'text-white/5 translate-y-0 rotate-0' : 'text-white/0 translate-y-10 -rotate-12'}
          `}
        >
          {currentData.type === 'quote' 
            ? <Lightbulb className="w-20 h-20" />
            : <HelpCircle className="w-20 h-20" />
          }
        </div>
        <div 
          className={`
            absolute top-2 left-2 text-white/20
            transition-all duration-700 delay-200
            ${showBadge ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}
          `}
        >
          <Sparkles className="w-4 h-4 animate-pulse" />
        </div>
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {/* Badge */}
        <div 
          className={`
            inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5 mb-2
            transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
            ${showBadge 
              ? 'opacity-100 translate-x-0 scale-100' 
              : 'opacity-0 -translate-x-6 scale-90'
            }
          `}
        >
          <span className={`transition-transform duration-700 ease-out ${showBadge ? 'rotate-[360deg]' : 'rotate-0'}`}>
            {currentData.badgeIcon}
          </span>
          <span className="text-white text-[10px] font-semibold tracking-wide">{currentData.badge}</span>
        </div>

        {/* Main Content */}
        <div 
          className={`
            flex items-start gap-1.5 mb-2 pr-6
            transition-all duration-600 ease-[cubic-bezier(0.4,0,0.2,1)]
            ${showContent 
              ? 'opacity-100 translate-y-0 blur-0' 
              : 'opacity-0 translate-y-4 blur-[2px]'
            }
          `}
        >
          <span 
            className={`
              flex-shrink-0 mt-0.5
              transition-all duration-500 ease-out
              ${showContent ? 'rotate-0 scale-100' : '-rotate-45 scale-0'}
            `}
          >
            {currentData.mainIcon}
          </span>
          <p className="text-white font-bold text-sm sm:text-base leading-snug drop-shadow-md transition-all duration-500">
            {currentData.mainText}
          </p>
        </div>
        
        {/* Sub Content */}
        {currentData.type !== 'support' && (
          <p 
            className={`
              text-white/90 text-xs font-medium mb-2 pl-5
              transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
              ${showSubContent 
                ? 'opacity-100 translate-x-0 blur-0' 
                : 'opacity-0 translate-x-6 blur-[1px]'
              }
            `}
          >
            {currentData.type === 'quote' ? currentData.subText : `📍 ${currentData.subText}`}
          </p>
        )}
        
        {/* Detail Box - Regular content */}
        {currentData.type !== 'support' && (
          <div 
            className={`
              flex items-center gap-2 bg-black/20 backdrop-blur-sm rounded-lg px-2.5 py-2
              transition-all duration-600 ease-[cubic-bezier(0.4,0,0.2,1)]
              ${showDetail 
                ? 'opacity-100 translate-y-0 scale-100 blur-0' 
                : 'opacity-0 translate-y-6 scale-95 blur-[2px]'
              }
            `}
          >
            <div 
              className={`
                flex-shrink-0 w-7 h-7 ${currentData.type === 'quote' ? 'bg-yellow-400/90' : 'bg-blue-400/90'} rounded-full flex items-center justify-center shadow-md
                transition-all duration-500 ease-out delay-75
                ${showDetail ? 'scale-100 rotate-0' : 'scale-0 -rotate-180'}
              `}
            >
              {currentData.detailIcon}
            </div>
            <div className="transition-all duration-400">
              <p className={`${currentData.type === 'quote' ? 'text-yellow-300' : 'text-blue-200'} text-[10px] font-semibold uppercase tracking-wider`}>
                {currentData.detailTitle}
              </p>
              <p className="text-white text-xs leading-tight">
                {currentData.detailText}
              </p>
            </div>
          </div>
        )}

        {/* Support Contact Info */}
        {currentData.type === 'support' && (
          <div 
            className={`
              space-y-2 mt-2
              transition-all duration-600 ease-[cubic-bezier(0.4,0,0.2,1)]
              ${showSubContent 
                ? 'opacity-100 translate-y-0 blur-0' 
                : 'opacity-0 translate-y-4 blur-[2px]'
              }
            `}
          >
            {/* Email */}
            <div 
              className={`
                flex items-center gap-2 bg-black/20 backdrop-blur-sm rounded-lg px-3 py-2
                transition-all duration-500 delay-100
                ${showDetail ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}
              `}
            >
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500/90 rounded-full flex items-center justify-center shadow-md">
                <Mail className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-blue-200 text-[10px] font-semibold uppercase tracking-wider">E-mail</p>
                <p className="text-white text-sm font-medium">{SUPPORT_INFO.email}</p>
              </div>
            </div>

            {/* Phone */}
            <div 
              className={`
                flex items-center gap-2 bg-black/20 backdrop-blur-sm rounded-lg px-3 py-2
                transition-all duration-500 delay-200
                ${showDetail ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}
              `}
            >
              <div className="flex-shrink-0 w-8 h-8 bg-green-500/90 rounded-full flex items-center justify-center shadow-md">
                <Phone className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-green-200 text-[10px] font-semibold uppercase tracking-wider">Telefone</p>
                <p className="text-white text-sm font-medium">{SUPPORT_INFO.phone}</p>
              </div>
            </div>
          </div>
        )}
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
